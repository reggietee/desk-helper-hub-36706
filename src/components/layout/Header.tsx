
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Menu, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "py-3 bg-white/90 backdrop-blur-lg shadow-sm" : "py-5 bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-semibold tracking-tight">CoWork</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" active={location.pathname === "/"}>
              Home
            </NavLink>
            <NavLink to="/booking" active={location.pathname.includes("/booking")}>
              Book a Space
            </NavLink>
            <NavLink to="/my-bookings" active={location.pathname === "/my-bookings"}>
              My Bookings
            </NavLink>
            
            <Button size="sm" className="ml-4">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden rounded-md p-2 text-gray-700" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={cn(
          "fixed inset-0 bg-white z-40 transition-transform duration-300 ease-in-out transform md:hidden",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ top: '60px' }}
      >
        <nav className="flex flex-col p-8 space-y-5">
          <MobileNavLink to="/" icon={<Calendar className="h-5 w-5" />}>
            Home
          </MobileNavLink>
          <MobileNavLink to="/booking" icon={<Calendar className="h-5 w-5" />}>
            Book a Space
          </MobileNavLink>
          <MobileNavLink to="/my-bookings" icon={<User className="h-5 w-5" />}>
            My Bookings
          </MobileNavLink>
          
          <Button className="w-full mt-4">
            Sign In
          </Button>
        </nav>
      </div>
    </header>
  );
}

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  active: boolean;
}

function NavLink({ to, children, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary relative py-1",
        active ? "text-primary" : "text-gray-700"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transform animate-fade-in" />
      )}
    </Link>
  );
}

interface MobileNavLinkProps {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

function MobileNavLink({ to, children, icon }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center text-lg font-medium text-gray-800 hover:text-primary transition-colors"
    >
      {icon}
      <span className="ml-2">{children}</span>
    </Link>
  );
}
