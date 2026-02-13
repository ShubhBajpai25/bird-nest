"use client";

import { Amplify } from "aws-amplify";
import { authConfig } from "@/app/lib/auth-config";
import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { useRouter, usePathname } from "next/navigation";

Amplify.configure(authConfig);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    checkUser();
  }, [pathname]);

  async function checkUser() {
    try {
      await getCurrentUser();
      // If logged in and on auth pages, redirect to dashboard
      if (pathname === "/login" || pathname === "/signup") {
        router.push("/dashboard/gallery");
      }
    } catch {
      // If not logged in and trying to access protected pages, redirect to login
      if (pathname.startsWith("/dashboard")) {
        router.push("/login");
      }
    } finally {
      setIsChecked(true);
    }
  }

  // Prevent flashing of protected content
  if (!isChecked) return null;

  return <>{children}</>;
}