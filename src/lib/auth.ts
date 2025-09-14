import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import { User, Company } from '@/models';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/maintenance_app');

export const authOptions: NextAuthOptions = {
  // adapter: MongoDBAdapter(client), // Temporarily disabled due to type conflicts
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ 
            email: credentials.email,
            isActive: true 
          }).populate('companyId');

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId._id.toString(),
            company: user.companyId,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
        token.company = user.company;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string;
        session.user.company = token.company as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
