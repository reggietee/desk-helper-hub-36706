import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRef } from 'react';

interface HCaptchaComponentProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function HCaptchaComponent({ onVerify, onError, onExpire }: HCaptchaComponentProps) {
  const captchaRef = useRef<HCaptcha>(null);

  return (
    <div className="flex justify-center my-4">
      <HCaptcha
        ref={captchaRef}
        sitekey="10000000-ffff-ffff-ffff-000000000001" // hCaptcha test site key
        onVerify={onVerify}
        onError={onError}
        onExpire={onExpire}
      />
    </div>
  );
}
