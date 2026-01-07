import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landpage from "./Landpage";
import Signup from "./Signup";
import Login from "./Login";
import Showcase from "./Showcase";
import GeneratePage from "./GeneratePage";
import VerifyOtp from "./VerifyOtp";
import ForgotPassword from "./Components/ForgotPassword";
import Blogs from "./Pages/Blogs";
import Document from "./Pages/Document";
import Tutorial from "./Pages/Tutorial";
import HelpCenter from "./Pages/HelpCenter";
import Contact from "./Pages/Contact";
import AdminDashboard from "./Pages/AdminDashboard";
import MyStorage from "./Pages/MyStorage";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landpage />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/verify-otp",
    element: <VerifyOtp />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/showcase",
    element: <Showcase />
  },
  {
    path: "/text-to-3d",
    element: <GeneratePage />
  },
  {
    path: "/image-to-3d",
    element: <GeneratePage />
  },
  {
    path: "/generate",
    element: <GeneratePage />
  },
  {
    path: "/blogs",
    element: <Blogs />
  },
  {
    path: "/docs",
    element: <Document />
  },
  {
    path: "/tutorials",
    element: <Tutorial />
  },
  {
    path: "/help",
    element: <HelpCenter />
  },
  {
    path: "/contact",
    element: <Contact />
  },
  {
    path: "/admin",
    element: <AdminDashboard />
  },
  {
    path: "/my-storage",
    element: <MyStorage />
  }
]);

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
