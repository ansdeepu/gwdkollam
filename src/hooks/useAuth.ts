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
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { type UserRole, type Designation } from '@/lib/schemas';
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
  designation?: Designation; // Added designation
  createdAt?: Date;
  lastActiveAt?: Date;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.isApproved || userData.email === ADMIN_EMAIL) {
            let staffInfo: { designation?: Designation } = {};
            if (userData.staffId) {
                const staffDocRef = doc(db, "staffMembers", userData.staffId);
                const staffDocSnap = await getDoc(staffDocRef);
                if (staffDocSnap.exists()) {
                   staffInfo = staffDocSnap.data();
                }
            }
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              name: userData.name || fbUser.email,
              role: userData.role || 'viewer',
              isApproved: userData.isApproved,
              staffId: userData.staffId,
              designation: staffInfo.designation,
              createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
              lastActiveAt: userData.lastActiveAt instanceof Timestamp ? userData.lastActiveAt.toDate() : undefined,
            });
          } else {
            // User exists but is not approved
            toast({
              title: "Account Pending Approval",
              description: "Your account must be approved by an administrator. Contact 8547650853 for activation.",
              variant: "destructive",
              duration: 8000,
            });
            await signOut(auth);
            setUser(null);
          }
        } else if (fbUser.email === ADMIN_EMAIL) {
          // Admin user logging in for the first time
          const adminProfile = {
            uid: fbUser.uid, email: fbUser.email, name: fbUser.email.split('@')[0],
            role: 'editor' as UserRole, isApproved: true,
            createdAt: new Date(),
          };
          await setDoc(doc(db, "users", fbUser.uid), { ...adminProfile, createdAt: Timestamp.now() });
          setUser(adminProfile);
        } else {
          // User exists in Auth but not in Firestore and is not admin
          await signOut(auth);
          setUser(null);
        }
      } else {
        // No Firebase user
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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
    let fbUser: FirebaseUser | null = null;
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      fbUser = userCredential.user;

      const roleToAssign: UserRole = isAdmin ? 'editor' : 'viewer';
      const isApprovedToAssign = isAdmin;

      const userProfileData: Omit<UserProfile, 'uid' | 'createdAt' | 'lastActiveAt' | 'designation'> & { createdAt: Timestamp, lastActiveAt: Timestamp, email: string | null, name?: string } = {
        email: fbUser.email,
        name: name || fbUser.email?.split('@')[0],
        role: roleToAssign,
        isApproved: isApprovedToAssign,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      };

      await setDoc(doc(db, "users", fbUser.uid), userProfileData);

      if (!isAdmin && auth.currentUser && auth.currentUser.uid === fbUser.uid) {
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
    if (!user || user.role !== 'editor') {
      return { success: false, error: { message: "You do not have permission to create users." } };
    }
  
    const tempAppName = `temp-app-create-user-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
  
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;
  
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
  
      await signOut(tempAuth);
      await deleteApp(tempApp);
  
      return { success: true };
    } catch (error: any) {
      console.error(`[Auth] [CreateUserByAdmin] Failed for ${email}:`, error);
      let errorMessage = error.message || "An unexpected error occurred during user creation.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = `The email address ${email} is already in use.`;
      }
      await deleteApp(tempApp).catch(e => console.error("Failed to delete temp app on error", e));
      return { success: false, error: { message: errorMessage, code: error.code } };
    }
  }, [user]);
  
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("[Auth] Firebase logout error:", error);
    }
  }, [router]);

  const fetchAllUsers = useCallback(async (): Promise<UserProfile[]> => {
    if (!user || !['editor', 'viewer'].includes(user.role)) {
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
  }, [user]); 

  const updateUserApproval = useCallback(async (targetUserUid: string, isApproved: boolean): Promise<void> => {
    if (!user || user.role !== 'editor') {
      throw new Error("User does not have permission to update approval.");
    }
    try {
      const userDocRef = doc(db, "users", targetUserUid);
      await updateDoc(userDocRef, { isApproved });
    } catch (error: any) {
      console.error(`[Auth] Error updating approval for target UID ${targetUserUid}. Firestore error:`, error);
      throw error;
    }
  }, [user]);

  const updateUserRole = useCallback(async (targetUserUid: string, role: UserRole, staffId?: string): Promise<void> => {
    if (!user || user.role !== 'editor') {
        throw new Error("User does not have permission to update role.");
    }
    try {
        const userDocRef = doc(db, "users", targetUserUid);
        const dataToUpdate: any = { role };
        if (staffId) {
            dataToUpdate.staffId = staffId;
        } else if (role === 'viewer') { // If changing to viewer, unlink staffId
            dataToUpdate.staffId = null;
        }
        await updateDoc(userDocRef, dataToUpdate);
    } catch (error: any) {
        console.error(`[Auth] Error updating role for target UID ${targetUserUid}. Firestore error:`, error);
        throw error;
    }
  }, [user]);

  const deleteUserDocument = useCallback(async (targetUserUid: string): Promise<void> => {
    if (!user || user.role !== 'editor') {
      throw new Error("User does not have permission to delete user documents.");
    }
    if (user.uid === targetUserUid) {
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
  }, [user]);

  const batchDeleteUserDocuments = useCallback(async (targetUserUids: string[]): Promise<{ successCount: number, failureCount: number, errors: string[] }> => {
    if (!user || user.role !== 'editor') {
      throw new Error("User does not have permission to delete user documents.");
    }

    let successCount = 0;
    let failureCount = 0;
    const errorsEncountered: string[] = [];

    for (const targetUserUid of targetUserUids) {
      if (user.uid === targetUserUid) {
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
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: any }> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) {
      return { success: false, error: { message: "No authenticated user found." } };
    }

    try {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await firebaseUpdatePassword(fbUser, newPassword);
      return { success: true };
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "The current password you entered is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak. It must be at least 6 characters.";
      }
      console.error("[Auth] Update password error:", error);
      return { success: false, error: { message: errorMessage, code: error.code } };
    }
  }, []);


  return { 
    user, 
    firebaseUser,
    isLoading, 
    login, 
    logout, 
    register, 
    fetchAllUsers, 
    updateUserApproval, 
    updateUserRole, 
    deleteUserDocument, 
    batchDeleteUserDocuments, 
    updateUserLastActive, 
    createUserByAdmin, 
    updatePassword 
  };
}
