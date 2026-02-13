"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bird,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  User,
  Check,
  Camera,
  Sparkles,
} from "lucide-react";
import { signIn, signUp, confirmSignUp } from "aws-amplify/auth";

// Bird images split into 3 rows for the sliding showcase
const row1 = [
  "/birds/crows_1.jpg",
  "/birds/crows_2.jpg",
  "/birds/crows_3.jpg",
  "/birds/crows_4.jpg",
  "/birds/kingfisher_1.jpg",
  "/birds/kingfisher_2.jpg",
  "/birds/kingfisher_3.jpg",
];
const row2 = [
  "/birds/myna_1.jpg",
  "/birds/myna_2.jpg",
  "/birds/myna_3.jpg",
  "/birds/owl_1.jpg",
  "/birds/owl_2.jpg",
  "/birds/owl_3.jpg",
  "/birds/peacocks_1.jpg",
];
const row3 = [
  "/birds/peacocks_2.jpg",
  "/birds/peacocks_3.jpg",
  "/birds/pigeon_1.jpg",
  "/birds/pigeon_2.jpg",
  "/birds/sparrow_1.jpg",
  "/birds/sparrow_2.jpg",
  "/birds/sparrow_3.jpg",
];

type AuthMode = "signin" | "signup" | "verify";

function SlidingRow({
  images,
  direction,
}: {
  images: string[];
  direction: "left" | "right";
}) {
  const doubled = [...images, ...images];
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-3 ${
          direction === "right" ? "animate-slide-right" : "animate-slide-left"
        }`}
        style={{ width: "max-content" }}
      >
        {doubled.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-28 w-44 shrink-0 overflow-hidden rounded-xl"
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up only
  const [username, setUsername] = useState("");

  // Verification
  const [verificationCode, setVerificationCode] = useState("");

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setError(null);
    setMode(next);
  };

  // --- Sign In ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });
      if (isSignedIn) {
        router.push("/dashboard");
      } else if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        setError("Please check your email to verify your account.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Sign Up ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (username.includes("@")) {
      setError("Username cannot contain '@'.");
      setIsLoading(false);
      return;
    }
    try {
      await signUp({
        username,
        password,
        options: {
          userAttributes: { email, preferred_username: username },
        },
      });
      switchMode("verify");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Verify ---
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await confirmSignUp({
        username,
        confirmationCode: verificationCode,
      });
      await signIn({ username, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-deep">
      {/* ===== LEFT: Auth Forms ===== */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[480px] lg:shrink-0">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-accent-emerald/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent-gold/5 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-col items-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-gold/10 animate-pulse-glow">
              <Bird className="h-8 w-8 text-accent-gold" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <h1 className="text-2xl font-bold text-text-primary">
                  {mode === "signin"
                    ? "Welcome back"
                    : mode === "signup"
                    ? "Create your account"
                    : "Verify your email"}
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {mode === "signin"
                    ? "Sign in to your BirdNest account"
                    : mode === "signup"
                    ? "Join BirdNest and start cataloging"
                    : `Enter the code sent to ${email}`}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Card */}
          <div className="rounded-2xl border border-border bg-bg-surface/80 p-6 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {/* ---- Sign In Form ---- */}
              {mode === "signin" && (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSignIn}
                >
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-all hover:bg-accent-gold-light disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* ---- Sign Up Form ---- */}
              {mode === "signup" && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSignUp}
                >
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="BirdWatcher99"
                        className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full rounded-lg border border-border bg-bg-deep py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-all hover:bg-accent-gold-light disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* ---- Verification Form ---- */}
              {mode === "verify" && (
                <motion.form
                  key="verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleVerify}
                >
                  <div className="mb-6">
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-lg border border-border bg-bg-deep px-4 py-3 text-center text-xl font-bold tracking-widest text-text-primary focus:border-accent-gold/50 focus:outline-none focus:ring-1 focus:ring-accent-gold/30"
                      required
                    />
                    <p className="mt-2 text-center text-xs text-text-tertiary">
                      Check your email ({email}) for the 6-digit code.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold py-2.5 text-sm font-semibold text-bg-deep transition-all hover:bg-accent-gold-light disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Verify & Sign In
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Toggle link */}
          {mode !== "verify" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center text-sm text-text-secondary"
            >
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="font-medium text-accent-gold transition-colors hover:text-accent-gold-light"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="font-medium text-accent-gold transition-colors hover:text-accent-gold-light"
                  >
                    Sign in
                  </button>
                </>
              )}
            </motion.p>
          )}
        </div>
      </div>

      {/* ===== DIVIDER ===== */}
      <div className="hidden lg:flex items-center">
        <div className="h-[70%] w-px bg-gradient-to-b from-transparent via-border-light to-transparent" />
      </div>

      {/* ===== RIGHT: Sliding Bird Showcase ===== */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center overflow-hidden px-8">
        {/* Hero message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-gold/20 bg-accent-gold/5 px-4 py-1.5">
            <Camera className="h-4 w-4 text-accent-gold" />
            <span className="text-xs font-medium text-accent-gold">
              AI-Powered Detection
            </span>
          </div>
          <h2 className="text-3xl font-bold text-text-primary">
            Take a picture and
            <br />
            <span className="inline-flex items-center gap-2 text-accent-gold">
              scan it in now
              <Sparkles className="h-6 w-6" />
            </span>
          </h2>
          <p className="mt-3 max-w-sm text-sm text-text-secondary">
            Upload any bird photo and our AI will instantly identify the species,
            count, and more.
          </p>
        </motion.div>

        {/* Sliding image rows */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex w-full flex-col gap-3"
        >
          <SlidingRow images={row1} direction="right" />
          <SlidingRow images={row2} direction="left" />
          <SlidingRow images={row3} direction="right" />
        </motion.div>

        {/* Fade edges for polish */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full lg:left-[480px]">
          <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg-deep to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg-deep to-transparent" />
        </div>
      </div>
    </div>
  );
}