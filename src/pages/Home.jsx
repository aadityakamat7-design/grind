import React from "react";
import { useOutletContext } from "react-router-dom";
import TeenHome from "@/components/home/TeenHome";
import ParentDashboard from "@/components/home/ParentDashboard";
import BuyerBrowse from "@/components/home/BuyerBrowse";

export default function Home() {
  const { user } = useOutletContext();
  if (user.app_role === "teen") return <TeenHome user={user} />;
  if (user.app_role === "parent") return <ParentDashboard user={user} />;
  return <BuyerBrowse user={user} />;
}