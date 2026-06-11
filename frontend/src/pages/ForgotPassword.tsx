import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import loginbg from "../assets/loginbg.svg";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email,
      });
      setStatus("success");
      // For hackathon: log debug token if provided
      if (res.data.debug_token) {
        setMessage(
          `Success: ${res.data.message} (Check console for debug token)`,
        );
      } else {
        setMessage(
          res.data.message ||
            "If that email exists, a reset link has been sent.",
        );
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to send request",
      );
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#5865F2]">
      <img
        src={loginbg}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Left Logo */}
      <div className="absolute top-8 left-8 flex items-center space-x-2 z-10">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 127.14 96.36"
          fill="currentColor"
        >
          <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z" />
        </svg>
        <span className="text-white font-bold text-xl tracking-wide">
          Discord
        </span>
      </div>

      <div className="relative bg-[#313338] p-8 rounded-lg shadow-2xl w-full max-w-md z-10 transition-transform duration-300">
        <div className="text-center mb-6">
          <h2 className="text-[24px] font-bold text-[#f2f3f5] mb-2 tracking-wide">
            Reset Password
          </h2>
          <p className="text-[16px] text-[#b5bac1]">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {status === "error" && (
          <div className="bg-[#f23f42] text-white text-sm px-3 py-2 rounded mb-4 text-center">
            {message}
          </div>
        )}
        {status === "success" && (
          <div className="bg-[#23a559] text-white text-sm px-3 py-2 rounded mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[12px] font-bold text-[#b5bac1] uppercase mb-2">
              Email <span className="text-[#f23f42]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-[10px] rounded focus:bg-[#1e1f22] border-none outline-none ring-0 focus:ring-1 focus:ring-[#00a8fc]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-[10px] rounded transition duration-200 mt-2 flex items-center justify-center"
          >
            {status === "loading" ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-4 text-[14px] text-[#949ba4]">
          <Link
            to="/login"
            className="text-[#00a8fc] hover:underline font-medium"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};
