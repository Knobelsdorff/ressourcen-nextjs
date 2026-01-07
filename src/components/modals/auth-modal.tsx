// src/components/modals/AuthModal.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Icons } from "../ui/icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconArrowRight } from "@tabler/icons-react";
import { createSPAClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../ui/form";

// OTP Input Component
interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  className?: string;
}

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  className = "",
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));

  useEffect(() => {
    const otpArray = value
      .split("")
      .concat(new Array(length).fill(""))
      .slice(0, length);
    setOtp(otpArray);
  }, [value, length]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus next input
    if (element.value !== "" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const pastedArray = pastedData
      .split("")
      .filter((char) => !isNaN(Number(char)))
      .slice(0, length);

    const newOtp = [...otp];
    pastedArray.forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char;
      }
    });

    setOtp(newOtp);
    onChange(newOtp.join(""));

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex((val) => val === "");
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className={`flex gap-2 justify-center ${className}`}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={digit}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          maxLength={1}
          className="w-12 h-12 text-center text-lg font-mono  border-2 border-color-primary-300/30 text-color-primary-300 focus:ring-2 focus:ring-color-primary-700/50 focus:border-color-primary-700 rounded-lg focus:outline-none"
        />
      ))}
    </div>
  );
};

// Email form validation schema
const emailSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// OTP form validation schema
const otpSchema = z.object({
  otp: z.string().min(6, { message: "OTP must be at least 6 characters" }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export function AuthModal({
  isOnLandingPage = false,
  isOnSubscriptionCard = false,
  buttonText,
  buttonTextMobile,
  buttonTextLoggedIn = "Go to Dashboard",
  buttonTextMobileLoggedIn = "Dashboard",
  buttonSize = "large",
  buttonSizeMobile = "default",
  buttonVariant = "primary",
  buttonClassName = "",
  buttonCustomBackground,
  buttonCustomTextColor,
  buttonCustomHoverColor,
  buttonElevation,
  buttonRounded,
  buttonShowArrow,
  children ,
}: {
  isOnLandingPage?: boolean;
  isOnSubscriptionCard?: boolean;
  buttonText?: string;
  buttonTextMobile?: string;
  buttonTextLoggedIn?: string;
  buttonTextMobileLoggedIn?: string;
  buttonSize?: "xsmall" | "small" | "default" | "large" | "xlarge";
  buttonSizeMobile?: "xsmall" | "small" | "default" | "large" | "xlarge";
  buttonVariant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success";
  buttonClassName?: string;
  buttonCustomBackground?: string;
  buttonCustomTextColor?: string;
  buttonCustomHoverColor?: string;
  buttonElevation?: "flat" | "low" | "medium" | "high";
  buttonRounded?: "full" | "lg" | "md" | "sm" | "none";
  buttonShowArrow?: boolean;
  children?: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(120); // 2 minutes in seconds
  const supabase = createSPAClient();
  const router = useRouter();
  const { user } = useAuth();

  // Determine button text based on auth state
  const displayButtonText =
    buttonText || (user ? buttonTextLoggedIn : "Sign in/Sign up");
  const displayButtonTextMobile =
    buttonTextMobile || (user ? buttonTextMobileLoggedIn : "Sign in");

  // Handle button click when user is already logged in
  const handleAuthButtonClick = () => {
    if (user) {
      // If on landing page (e.g., /ankommen), go to /figur, otherwise dashboard
      if (isOnLandingPage) {
        router.push("/figur");
      } else {
        router.push("/dashboard");
      }
      return;
    }
    // Otherwise, the dialog will open as normal
  };

  // Form for email input
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form for OTP verification
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpForm && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpForm, resendTimer]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Handle email submission to request OTP
  async function onEmailSubmit(values: EmailFormValues) {
    setIsLoading(true);
    try {
      // Normalize email to avoid case sensitivity issues
      const emailToUse = values.email.toLowerCase().trim();

      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      setCurrentEmail(emailToUse); // Store normalized email
      setShowOtpForm(true);
      setCanResend(false);
      setResendTimer(120); // Reset timer
      toast.success("Check your email for the verification code");
    } catch (err: any) {
      toast.error(
        err.message || "An unexpected error occurred. Please try again."
      );
      console.error("Email submission error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OTP verification with improved error handling
  async function onOtpSubmit(values: OtpFormValues) {
    setIsLoading(true);
    try {
      // Clean and validate OTP
      const otpToken = values.otp.trim().replace(/\s/g, "");

      if (otpToken.length !== 6) {
        throw new Error("Please enter a valid 6-digit code");
      }

      if (!/^\d{6}$/.test(otpToken)) {
        throw new Error("Please enter only numbers");
      }

      console.log("Attempting OTP verification:", {
        email: currentEmail,
        tokenLength: otpToken.length,
        timestamp: new Date().toISOString(),
      });

      // Try multiple verification approaches
      let verificationResult;

      // First attempt: standard email OTP
      verificationResult = await supabase.auth.verifyOtp({
        email: currentEmail,
        token: otpToken,
        type: "email",
      });

      // If that fails, try with magiclink type (some Supabase configs use this)
      if (verificationResult.error) {
        console.log(
          "First attempt failed, trying magiclink type:",
          verificationResult.error.message
        );
        verificationResult = await supabase.auth.verifyOtp({
          email: currentEmail,
          token: otpToken,
          type: "magiclink",
        });
      }

      if (verificationResult.error) {
        console.error("OTP verification failed:", verificationResult.error);

        // Provide specific error messages
        if (verificationResult.error.message.includes("expired")) {
          throw new Error(
            "Verification code has expired. Please request a new one."
          );
        } else if (
          verificationResult.error.message.includes("invalid") ||
          verificationResult.error.message.includes("Token has expired")
        ) {
          throw new Error(
            "Invalid or expired verification code. Please try again or request a new code."
          );
        } else {
          throw new Error(
            verificationResult.error.message ||
              "Verification failed. Please try again."
          );
        }
      }

      console.log("OTP verification successful");

      // Success - redirect based on context
      router.refresh();
      if (isOnLandingPage) {
        router.push("/figur");
      } else {
        router.push("/dashboard");
      }

      toast.success("Successfully verified!");
      setIsOpen(false);
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
      toast.error(
        err.message || "Invalid verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Reset state when dialog closes
  function handleOpenChange(open: boolean) {
    // If user is logged in and trying to open the dialog, redirect based on context
    if (open && user) {
      if (isOnLandingPage) {
        router.push("/figur");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    setIsOpen(open);
    if (!open) {
      setShowOtpForm(false);
      setCurrentEmail("");
      setCanResend(false);
      setResendTimer(120);
      emailForm.reset();
      otpForm.reset();
    }
  }

  // Handle resend OTP with improved error handling
  async function handleResendOtp() {
    setIsLoading(true);
    try {
      if (!currentEmail) {
        throw new Error("No email address found. Please start over.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      setCanResend(false);
      setResendTimer(120); // Reset timer
      toast.success("A new verification code has been sent to your email");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      toast.error(
        err.message || "Failed to resend verification code. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Social login handlers
  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      setIsOpen(false);
    } catch (err: any) {
      console.error("Google sign in error:", err);
      toast.error(err.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div onClick={handleAuthButtonClick}>
          {
            children ? children : (

              <>
              
             <a
  href={user ? "/dashboard" : "#"}
  className={`lg:flex hidden items-center justify-center 
    ${buttonClassName}
    ${buttonSize}
    ${buttonVariant}
    ${buttonCustomBackground}
    ${buttonCustomTextColor}
    ${buttonCustomHoverColor ? `hover:${buttonCustomHoverColor}` : ""}
    ${buttonElevation}
    ${buttonRounded ? `rounded-${buttonRounded}` : "rounded-md"}
  `}
>
  {displayButtonText}
</a>

<a
  href={user ? "/dashboard" : "#"}
  className={`lg:hidden block py-2 px-4 items-center justify-center
    ${buttonClassName}
    ${buttonSizeMobile}
    ${buttonVariant}
    ${buttonCustomBackground}
    ${buttonCustomTextColor}
    ${buttonCustomHoverColor ? `hover:${buttonCustomHoverColor}` : ""}
    ${buttonElevation}
    ${buttonRounded ? `rounded-${buttonRounded}` : "rounded-md"}
  `}
>
  {displayButtonTextMobile}
</a>

              </>
            )
          }
         
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]  border-2 border-color-primary-300/30">
        <DialogHeader>
          <DialogTitle className="text-color-primary-300 text-lg font-bold">
            Sign In
          </DialogTitle>
          <DialogDescription className="text-color-primary-300/70 text-sm">
            {showOtpForm
              ? "Enter the verification code sent to your email"
              : "Enter your email to sign in or create an account"}
          </DialogDescription>
        </DialogHeader>

        {!showOtpForm && (
          <>
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full mb-2 flex gap-2 bg-transparent border-2 border-color-primary-300/30 text-color-primary-300 hover:bg-color-primary-300/10 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 h-11 text-sm"
            >
              {isLoading ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.ColorGoogle height={18} width={18} className="mr-2" />
              )}{" "}
              Google
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-color-primary-300/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className=" px-2 text-color-primary-300/60 font-bold tracking-wider text-xs">
                  Or continue with
                </span>
              </div>
            </div>

            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                className="space-y-3"
              >
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-color-primary-300 uppercase tracking-wider">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="hello@example.com"
                          {...field}
                          className=" border-2 border-color-primary-300/30 text-color-primary-300 placeholder:text-color-primary-300/50 focus:ring-2 focus:ring-color-primary-700/50 focus:border-color-primary-700 rounded-xl h-11 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}

        {showOtpForm && (
          <>
            <div className="mb-3 text-center p-3 bg-color-primary-700/10 rounded-xl border-2 border-color-primary-700/20">
              <p className="text-xs text-color-primary-300">
                We've sent a verification code to{" "}
                <span className="font-bold text-color-primary-400">
                  {currentEmail}
                </span>
              </p>
            </div>

            <Form {...otpForm}>
              <form
                onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                className="space-y-3"
              >
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-color-primary-300 uppercase tracking-wider">
                        Verification Code
                      </FormLabel>
                      <FormControl>
                        <OTPInput
                          value={field.value}
                          onChange={field.onChange}
                          length={6}
                          className="mt-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-color-primary-700 hover:bg-color-primary-700/90 text-black font-bold py-3 px-6 rounded-xl uppercase tracking-wider transition-all duration-300 hover:scale-105 shadow-lg border-2 border-white/20 text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <div className="flex flex-col space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent border-2 border-color-primary-300/30 text-color-primary-300 hover:bg-color-primary-300/10 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 text-xs"
                    onClick={() => {
                      setShowOtpForm(false);
                      setCurrentEmail("");
                      setCanResend(false);
                      setResendTimer(120);
                      otpForm.reset();
                    }}
                  >
                    Use a different email
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-color-primary-300/70 mb-2">
                      Didn't receive a code?
                      {!canResend &&
                        ` You can resend in ${formatTime(resendTimer)}`}
                    </p>

                    <Button
                      type="button"
                      variant="ghost"
                      className="text-color-primary-700 hover:text-color-primary-700/80 hover:bg-color-primary-700/10 font-bold uppercase tracking-wider transition-all duration-300 text-xs"
                      onClick={handleResendOtp}
                      disabled={!canResend || isLoading}
                    >
                      {isLoading ? (
                        <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : canResend ? (
                        "Resend code"
                      ) : (
                        "Resend code"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
