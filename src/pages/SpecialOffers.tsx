import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Gift } from 'lucide-react';

export default function SpecialOffers() {
  const navigate = useNavigate();

  const handleContactZannes = () => {
    window.location.href = 'mailto:madaline@zanneslaw.com';
  };

  const handleContactUs = () => {
    window.location.href = 'mailto:reggie@havenworkspace.ca';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Special Offers</h1>
          <p className="text-lg text-muted-foreground">
            As a Haven Workspace member, you have access to exclusive discounts and offers from our partners.
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">Zannes Law Firm</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Professional business legal services
                  </CardDescription>
                </div>
                <Badge className="text-lg px-3 py-1" variant="secondary">
                  25% OFF
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Get 25% off all business legal services including contracts, incorporation, and legal consultation.
              </p>
              <Button onClick={handleContactZannes} className="w-full sm:w-auto">
                <Mail className="mr-2 h-4 w-4" />
                Contact Zannes Law
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">Apertivo</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Fresh foods and specialty coffee
                  </CardDescription>
                </div>
                <Badge className="text-lg px-3 py-1" variant="secondary">
                  15% OFF
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enjoy 15% off all fresh foods and coffee. Just mention you're a member at Haven to receive your discount.
              </p>
              <p className="text-sm text-muted-foreground mt-4 italic">
                * Simply show your Haven membership or mention you're a member when ordering.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Offer a Member Discount?</CardTitle>
            </div>
            <CardDescription className="text-base">
              Are you a Haven member with a business who would like to provide a special offer to other members?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We'd love to feature your business and help our community support each other. Contact us to discuss adding your offer to this page.
            </p>
            <Button onClick={handleContactUs} variant="outline" className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}