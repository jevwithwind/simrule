import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Tour from './components/Tour';
import Dashboard from './pages/Dashboard';
import Intake from './pages/Intake';
import RuleReview from './pages/RuleReview';
import Compare from './pages/Compare';
import Consistency from './pages/Consistency';
import Precedents from './pages/Precedents';
import HowItWorks from './pages/HowItWorks';
import NotFound from './pages/NotFound';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to main content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/intake" element={<Intake />} />
          <Route path="/rule/:id" element={<RuleReview />} />
          <Route path="/compare/:a/:b" element={<Compare />} />
          <Route path="/consistency" element={<Consistency />} />
          <Route path="/precedents" element={<Precedents />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Tour />
    </div>
  );
}
