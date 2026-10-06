import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.replace(/^\//, "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center">
        <FileQuestion className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {pageName ? `“${pageName}” is not a page in this app.` : "This page could not be found."}
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
