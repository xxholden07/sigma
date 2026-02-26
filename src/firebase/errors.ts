
'use client';
import { getAuth, type User } from 'firebase/auth';
import { getApps, getApp } from 'firebase/app';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}

interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: any;
  };
}

function buildAuthObject(currentUser: User | null): FirebaseAuthObject | null {
  if (!currentUser) return null;

  return {
    uid: currentUser.uid,
    token: {
      name: currentUser.displayName,
      email: currentUser.email,
      email_verified: currentUser.emailVerified,
      phone_number: currentUser.phoneNumber,
      sub: currentUser.uid,
      firebase: {
        identities: currentUser.providerData.reduce((acc, p) => {
          if (p.providerId) acc[p.providerId] = [p.uid];
          return acc;
        }, {} as Record<string, string[]>),
        sign_in_provider: currentUser.providerData[0]?.providerId || 'custom',
        tenant: currentUser.tenantId,
      },
    },
  };
}

function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  let authObject: FirebaseAuthObject | null = null;
  
  if (getApps().length > 0) {
    try {
      const app = getApp();
      const auth = getAuth(app);
      if (auth.currentUser) {
        authObject = buildAuthObject(auth.currentUser);
      }
    } catch (e) {
      // Falha silenciosa se o Firebase não estiver pronto ou em ambiente de build
    }
  }

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}

export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    const message = `Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(requestObject, null, 2)}`;
    super(message);
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}
