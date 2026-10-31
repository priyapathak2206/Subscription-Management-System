import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-extrabold text-indigo-600">404</h1>
        <h2 className="text-xl font-bold text-slate-900 mt-4">Page Not Found</h2>
        <p className="text-sm text-slate-600 mt-2">
          The requested page does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Application
          </Link>
        </div>
      </div>
    </div>
  );
};

