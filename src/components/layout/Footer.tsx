
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-gray-100 py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-block">
              <span className="text-xl font-semibold tracking-tight">CoWork</span>
            </Link>
            <p className="mt-3 text-sm text-gray-600 max-w-md">
              Flexible workspaces designed for productivity, creativity, and connection.
              Book your perfect workspace today.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900">Spaces</h3>
            <ul className="mt-4 space-y-2">
              <FooterLink to="/booking?type=hot-desk">Hot Desks</FooterLink>
              <FooterLink to="/booking?type=meeting-room">Meeting Rooms</FooterLink>
              <FooterLink to="/booking?type=call-room">Call Rooms</FooterLink>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-900">Account</h3>
            <ul className="mt-4 space-y-2">
              <FooterLink to="/my-bookings">My Bookings</FooterLink>
              <FooterLink to="#">Profile Settings</FooterLink>
              <FooterLink to="#">Sign In</FooterLink>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} CoWork. All rights reserved.
          </p>
          
          <div className="mt-4 md:mt-0 flex space-x-6">
            <FooterLink to="#">Privacy Policy</FooterLink>
            <FooterLink to="#">Terms of Service</FooterLink>
            <FooterLink to="#">Cookie Policy</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface FooterLinkProps {
  to: string;
  children: React.ReactNode;
}

function FooterLink({ to, children }: FooterLinkProps) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-gray-600 hover:text-primary transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
