// NextAuth type declarations
import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId: string;
      company: {
        _id: string;
        name: string;
        logo?: string;
        primaryColor: string;
        appName: string;
        theme: 'light' | 'dark' | 'system';
        branding: {
          appName: string;
          logo?: string;
          primaryColor: string;
          secondaryColor?: string;
          accentColor?: string;
        };
      };
    };
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    company: {
      _id: string;
      name: string;
      logo?: string;
      primaryColor: string;
      appName: string;
      theme: 'light' | 'dark' | 'system';
      branding: {
        appName: string;
        logo?: string;
        primaryColor: string;
        secondaryColor?: string;
        accentColor?: string;
      };
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: string;
    companyId: string;
    company: {
      _id: string;
      name: string;
      logo?: string;
      primaryColor: string;
      appName: string;
      theme: 'light' | 'dark' | 'system';
      branding: {
        appName: string;
        logo?: string;
        primaryColor: string;
        secondaryColor?: string;
        accentColor?: string;
      };
    };
  }
}
