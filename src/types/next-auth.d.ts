import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
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

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    company: any;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    companyId: string;
    company: any;
  }
}
