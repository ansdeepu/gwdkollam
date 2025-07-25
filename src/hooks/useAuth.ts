// src/hooks/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { type UserRole } from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast"; 

const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'gwdklm@gmail.com';

export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string;
  role: UserRole;
  isApproved: boolean;
  staffId?: string;
  createdAt?: Date;
  lastActiveAt?: Date;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
}

export const updateUserLastActive = async (uid: string): Promise<void> => {
  if (!uid) return;
  const userDocRef = doc(db, "users", uid);
  try {
    await updateDoc(userDocRef, { lastActiveAt: Timestamp.now() });
  } catch (error) {
    // Suppress console warnings for this non-critical, throttled operation.
    // console.warn(`[Auth] Failed to update lastActiveAt for user ${uid}:`, error);
  }
};


export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    firebaseUser: null,
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true; 
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) {
        return;
      }

      let userProfile: UserProfile | null = null;

      try {
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const isAdminByEmail = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

          if (isAdminByEmail) {
            const userDocSnap = await getDoc(userDocRef);
            const adminName = userDocSnap.exists() ? userDocSnap.data().name : firebaseUser.email?.split('@')[0];
            userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: adminName ? String(adminName) : undefined,
                role: 'editor',
                isApproved: true,
                staffId: userDocSnap.exists() ? userDocSnap.data().staffId : undefined,
                createdAt: userDocSnap.exists() && userDocSnap.data().createdAt ? userDocSnap.data().createdAt.toDate() : new Date(),
                lastActiveAt: userDocSnap.exists() && userDocSnap.data().lastActiveAt ? userDocSnap.data().lastActiveAt.toDate() : undefined,
            };
            if (!userDocSnap.exists()) {
                await setDoc(doc(db, "users", firebaseUser.uid), {
                    email: firebaseUser.email,
                    name: userProfile.name,
                    role: 'editor',
                    isApproved: true,
                    createdAt: Timestamp.now(),
                });
            }
          } else { 
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                userProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: userData.name ? String(userData.name) : undefined,
                    role: userData.role || 'viewer',
                    isApproved: userData.isApproved === true,
                    staffId: userData.staffId || undefined,
                    createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
                    lastActiveAt: userData.lastActiveAt instanceof Timestamp ? userData.lastActiveAt.toDate() : undefined,
                };
            }
          }

          if (isMounted) {
            if (userProfile && userProfile.isApproved) {
              setAuthState({ isAuthenticated: true, isLoading: false, user: userProfile, firebaseUser });
            } else if (userProfile && !userProfile.isApproved) {
              if(auth.currentUser && auth.currentUser.uid === firebaseUser.uid) { 
                await signOut(auth); 
              }
              setAuthState({ isAuthenticated: false, isLoading: false, user: userProfile, firebaseUser: null });
              toast({
                  title: "Account Pending Approval",
                  description: "Your account is not yet approved by an administrator. Please contact 8547650853 for activation.",
                  variant: "destructive",
                  duration: 8000
              });
            } else if (!userProfile) { 
               if(auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
                  await signOut(auth); 
               }
               setAuthState({ isAuthenticated: false, isLoading: false, user: null, firebaseUser: null });
            }
          }

        } else { 
          if (isMounted) {
            setAuthState({ isAuthenticated: false, isLoading: false, user: null, firebaseUser: null });
          }
        }
      } catch (error: any) {
        console.error('[Auth] Error in onAuthStateChanged callback:', error);
        if (isMounted) {
          if (error.code === 'resource-exhausted') {
            toast({
                title: "Database Quota Exceeded",
                description: "The application has exceeded its database usage limits for the day. Please try again later.",
                variant: "destructive",
                duration: 9000
            });
          }
          if (auth.currentUser) {
              try { 
                await signOut(auth); 
              } catch (signOutError) { 
                console.error('[Auth] Error signing out after onAuthStateChanged error:', signOutError); 
              }
          }
          setAuthState({ isAuthenticated: false, isLoading: false, user: null, firebaseUser: null });
        }
      }
    });

    return () => {
      isMounted = false; 
      unsubscribe();
    }
  }, [toast]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: any }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error(`[Auth] Login failed for ${email}:`, error);
      if (error.code === 'resource-exhausted') {
        return { success: false, error: { message: "The database is temporarily unavailable due to high traffic (quota exceeded). Please try again later.", code: error.code } };
      }
      return { success: false, error: error };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: any }> => {
    let firebaseUser: FirebaseUser | null = null;
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      firebaseUser = userCredential.user;

      const roleToAssign: UserRole = isAdmin ? 'editor' : 'viewer';
      const isApprovedToAssign = isAdmin;

      const userProfileData: Omit<UserProfile, 'uid' | 'createdAt' | 'lastActiveAt'> & { createdAt: Timestamp, lastActiveAt: Timestamp, email: string | null, name?: string } = {
        email: firebaseUser.email,
        name: name || firebaseUser.email?.split('@')[0],
        role: roleToAssign,
        isApproved: isApprovedToAssign,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userProfileData);

      if (!isAdmin && auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
        await signOut(auth); 
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      let errorMessage = error.message || "An unexpected error occurred during registration.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `The email address ${email} is already in use by another account.`;
      }
      return { success: false, error: { message: errorMessage, code: error.code } };
    }
  }, []);

  const createUserByAdmin = useCallback(async (email: string, password: string, name: string, staffId: string): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || authState.user.role !== 'editor' || !auth.currentUser) {
      return { success: false, error: { message: "You do not have permission to create users." } };
    }
  
    // Create a temporary, secondary Firebase app instance to avoid session conflicts.
    const tempAppName = `temp-app-create-user-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
  
    try {
      // Create the new user in the temporary auth instance.
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;
  
      // Create the user's profile in Firestore with default 'viewer' role and unapproved status.
      const userProfileData = {
        email: newFirebaseUser.email,
        name: name,
        staffId: staffId,
        role: 'viewer' as UserRole,
        isApproved: false,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };
      await setDoc(doc(db, "users", newFirebaseUser.uid), userProfileData);
  
      // Clean up: Sign out from the temporary instance and delete the app.
      await signOut(tempAuth);
      await deleteApp(tempApp);
  
      return { success: true };
    } catch (error: any) {
      console.error(`[Auth] [CreateUserByAdmin] Failed for ${email}:`, error);
      let errorMessage = error.message || "An unexpected error occurred during user creation.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `The email address ${email} is already in use.`;
      }
      // Clean up the temp app on failure as well.
      await deleteApp(tempApp).catch(e => console.error("Failed to delete temp app on error", e));
      return { success: false, error: { message: errorMessage, code: error.code } };
    }
  }, [authState.user]);
  
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("[Auth] Firebase logout error:", error);
    }
  }, [router]);

  const fetchAllUsers = useCallback(async (): Promise<UserProfile[]> => {
    if (!authState.user || authState.user.role !== 'editor') {
      // Instead of throwing an error, return an empty array for non-editors.
      // This prevents crashes in components that call this function without checking permissions first.
      return [];
    }
    
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const usersList: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          uid: docSnap.id,
          email: data.email || null,
          name: data.name || undefined,
          role: data.role || 'viewer',
          isApproved: data.isApproved === true,
          staffId: data.staffId || undefined,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
          lastActiveAt: data.lastActiveAt instanceof Timestamp ? data.lastActiveAt.toDate() : undefined,
        });
      });
      return usersList;
    } catch (error: any) {
      console.error(`[Auth] Error fetching users. Firestore error:`, error);
      throw error;
    }
  }, [authState.user]); 

  const updateUserApproval = useCallback(async (targetUserUid: string, isApproved: boolean): Promise<void> => {
    if (!authState.user || authState.user.role !== 'editor') {
      throw new Error("User does not have permission to update approval.");
    }
    try {
      const userDocRef = doc(db, "users", targetUserUid);
      await updateDoc(userDocRef, { isApproved });
    } catch (error: any) {
      console.error(`[Auth] Error updating approval for target UID ${targetUserUid}. Firestore error:`, error);
      throw error;
    }
  }, [authState.user]);

  const updateUserRole = useCallback(async (targetUserUid: string, role: UserRole, staffId?: string): Promise<void> => {
    if (!authState.user || authState.user.role !== 'editor') {
        throw new Error("User does not have permission to update role.");
    }
    try {
        const userDocRef = doc(db, "users", targetUserUid);
        const dataToUpdate: any = { role };
        if (staffId) {
            dataToUpdate.staffId = staffId;
        }
        await updateDoc(userDocRef, dataToUpdate);
    } catch (error: any) {
        console.error(`[Auth] Error updating role for target UID ${targetUserUid}. Firestore error:`, error);
        throw error;
    }
  }, [authState.user]);

  const deleteUserDocument = useCallback(async (targetUserUid: string): Promise<void> => {
    if (!authState.user || authState.user.role !== 'editor') {
      throw new Error("User does not have permission to delete user documents.");
    }
    if (authState.user.uid === targetUserUid) {
      throw new Error("You cannot delete your own user profile.");
    }

    const targetUserDocRef = doc(db, "users", targetUserUid);
    const targetUserDocSnap = await getDoc(targetUserDocRef);
    if (targetUserDocSnap.exists() && targetUserDocSnap.data().email === ADMIN_EMAIL) {
        throw new Error(`The main admin user (${ADMIN_EMAIL}) cannot be deleted.`);
    }

    try {
      await deleteDoc(targetUserDocRef);
    } catch (error: any) {
      console.error(`[Auth] Error deleting document for target UID ${targetUserUid}. Firestore error:`, error);
      throw error;
    }
  }, [authState.user]);

  const batchDeleteUserDocuments = useCallback(async (targetUserUids: string[]): Promise<{ successCount: number, failureCount: number, errors: string[] }> => {
    if (!authState.user || authState.user.role !== 'editor') {
      throw new Error("User does not have permission to delete user documents.");
    }

    let successCount = 0;
    let failureCount = 0;
    const errorsEncountered: string[] = [];

    for (const targetUserUid of targetUserUids) {
      if (authState.user.uid === targetUserUid) {
        failureCount++;
        errorsEncountered.push(`Cannot delete own profile (UID: ${targetUserUid}).`);
        continue;
      }

      const targetUserDocRef = doc(db, "users", targetUserUid);
      const targetUserDocSnap = await getDoc(targetUserDocRef);

      if (targetUserDocSnap.exists() && targetUserDocSnap.data().email === ADMIN_EMAIL) {
        failureCount++;
        errorsEncountered.push(`Main admin profile (${ADMIN_EMAIL}) cannot be deleted.`);
        continue;
      }

      try {
        await deleteDoc(targetUserDocRef);
        successCount++;
      } catch (error: any) {
        failureCount++;
        errorsEncountered.push(`Failed to delete ${targetUserDocSnap.data()?.email || targetUserUid}: ${error.message}`);
      }
    }
    return { successCount, failureCount, errors: errorsEncountered };
  }, [authState.user]);


  return { ...authState, login, logout, register, fetchAllUsers, updateUserApproval, updateUserRole, deleteUserDocument, batchDeleteUserDocuments, updateUserLastActive, createUserByAdmin };
}
