import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa"; 
import logo from '../assets/logo.png'; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.endsWith("@crud-operations.com")) {
      return setError("Only employees with @crud-operations.com email can log in.");
    }

    const formData = {
      email: email.trim(),
      password: password.trim(),
    };

    if (!formData.email || !formData.password) {
      return alert("All fields are required");
    }

    try {
      const response = await fetch("http://localhost:8000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} - ${JSON.stringify(data)}`);
      }

      setMessage("Login successful! Redirecting...");
      setError("");
      toast.success("Login successful!");

      setTimeout(() => {
        navigate("/lobby");
      }, 2000);
    } catch (error) {
      console.error("Error during login:", error);
      setError("Invalid credentials. Please try again.");
      toast.error("Invalid credentials. Please try again.");
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
          <h1 className="text-2xl font-bold text-gray-800">Login</h1>
          <p className="text-gray-500 mt-2">Enter your credentials to log in</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-6">
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

            {/* Error Message */}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

            {/* Success Message */}
            {message && <p className="mt-1 text-sm text-green-500">{message}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
            >
              Login
            </button>
          </form>

          {/* Redirect to Signup */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
