'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getHomePath } from '@/lib/permissions';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Send each user straight to the first page they have access to
  useEffect(() => {
    if (loading) return;
    router.replace(user ? getHomePath(user) : '/login');
  }, [router, user, loading]);

  return (
    <div className="redirect-screen">
      <div className="placeholder shim"></div>
      <style jsx>{`
        .redirect-screen { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #ffffff; }
        .placeholder { width: 120px; height: 40px; border-radius: 4px; }
        .shim {
          background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
