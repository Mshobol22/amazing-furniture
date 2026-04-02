"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import AuthNav from "./AuthNav";

export default function ConditionalStoreNav({
  onMobileSaleStripChange,
}: {
  onMobileSaleStripChange?: (visible: boolean) => void;
}) {
  const pathname = usePathname();
  if (pathname === "/checkout") {
    return <AuthNav />;
  }
  return <Navbar onMobileSaleStripChange={onMobileSaleStripChange} />;
}
