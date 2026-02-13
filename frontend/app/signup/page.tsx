"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bird, Mail, Lock, ArrowRight, Eye, EyeOff, User, Check, Loader2, AlertCircle } from "lucide-react";
import { signUp, confirmSignUp, signIn, type SignUpOutput } from "aws-amplify/auth";

export default function SignupPage() {
  const router = useRouter();
  
  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Verification Code State
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"signup" | "verify">("signup");
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Handle Initial Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const output = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName, // Optional: Saves to Cognito
            family_name: lastName  // Optional: Saves to Cognito
          }
        }
      });
      
      // Move to verification step
      setStep("verify");
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Verification Code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await confirmSignUp({ username: email, confirmationCode: verificationCode });
      
      // Auto Sign-in after verification
      await signIn({ username: email, password });
      
      router.push("/dashboard/gallery");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-deep nature-bg">
       {/* ... (Keep your background motion divs) ... */}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <motion.div
          layout
          className="mb-8 flex flex-col items-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-gold/10 animate-pulse-glow">
            <Bird className="h-8 w-8 text-accent-gold" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {step === "signup" ? "Create your account" : "Verify Email"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {step === "signup" ? "Join BirdNest and start cataloging" : `Enter the code sent to ${email}`}
          </p>
        </motion.div>

        {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
        )}

        <motion.div
          layout
          className="rounded-2xl border border-border bg-bg-surface/80 p-6 backdrop-blur-sm"
        >
          <AnimatePresence mode="wait">
            {step === "signup" ? (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSignUp}
              >
                {/* ... (First/Last Name Inputs) ... */}
                 <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-3 text-sm text-text-primary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30" required />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-3 text-sm text-text-primary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30" required />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30" required />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-10 text-sm text-text-primary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={isLoading} className="group flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-all hover:bg-accent-gold-light disabled:opacity-60">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
                </motion.button>
              </motion.form>
            ) : (
              // VERIFICATION FORM (Swaps in automatically)
              <motion.form
                key="verify-form"