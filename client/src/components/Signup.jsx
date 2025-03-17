import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Importing icons
import logo from '../assets/logo.png'; 

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error before validation

    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      return setError("All fields are required");
    }
    if (!email.endsWith("@crud-operations.com")) {
      return setError("Only employees with @crud-operations.com email can sign up.");
    }


    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    const formData = {
      username: username.trim(),
      email: email.trim(),
      password: password.trim(),
    };

    try {
      const response = await fetch("http://localhost:8000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} - ${JSON.stringify(data)}`);
      }

      setMessage("Signup successful!");
      setError("");
      toast.success("Signup successful!");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError("Signup failed. Please try again.");
      toast.error("Signup failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="bg-white w-16 h-16 rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4">
            <img src={logo} alt="logo" className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sign Up</h1>
          <p className="text-gray-500 mt-2">Create your account to get started</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Input with Eye Icon */}
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Enter your password"
              />
              {/* Eye Icon */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  top: "65%",
                  right: "16px",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  color: "#6B7280",
                }}
              >
                {showPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
              </button>
            </div>

            {/* Confirm Password Input with Eye Icon */}
            <div className="relative">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Re-enter your password"
              />
              {/* Eye Icon */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  top: "65%",
                  right: "16px",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  color: "#6B7280",
                }}
              >
                {showConfirmPassword ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
              </button>
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {message && <p className="mt-1 text-sm text-green-500">{message}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
            >
              Sign Up
            </button>
          </form>

          {/* Redirect to Login */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
