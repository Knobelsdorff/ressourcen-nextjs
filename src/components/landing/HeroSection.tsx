"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/modals/auth-modal";
import Image from "next/image";

export default function HeroSection() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCTAClick = () => {
    if (user) {
      router.push("/");
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 px-4 py-20">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 items-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-amber-900 mb-6">
            Finde in nur wenigen Minuten mehr innere Ruhe
          </h1>

          <p className="text-xl md:text-2xl text-amber-700 mb-8">
            Wenn sich viel anstaut, findest du hier wieder mehr Halt
          </p>

          <div className="flex justify-center lg:justify-start">
            {user ? (
              <Button
                onClick={handleCTAClick}
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
              >
                Gleich ausprobieren
              </Button>
            ) : (
              <AuthModal isOnLandingPage={true}>
                <Button
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
                >
                  Gleich ausprobieren
                </Button>
              </AuthModal>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 lg:mt-0 flex justify-center"
        >
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection.webp"
            alt="Innere Ruhe aktivieren"
            width={600}
            height={600}
            className="rounded-3xl shadow-xl object-cover w-full max-w-md lg:max-w-none"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}
