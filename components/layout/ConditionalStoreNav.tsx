"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import AuthNav from "./AuthNav";

export default function ConditionalStoreNav() {
  const pathname = usePathname();
  if (pathname === "/checkout") {
    return <AuthNav />;
  }
  return <Navbar />;
}
