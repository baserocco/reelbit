
ALTER TABLE public.waitlist_signups 
ADD COLUMN referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
ADD COLUMN referred_by UUID REFERENCES public.waitlist_signups(id) DEFAULT NULL;

CREATE INDEX idx_waitlist_referral_code ON public.waitlist_signups(referral_code);
CREATE INDEX idx_waitlist_referred_by ON public.waitlist_signups(referred_by);
