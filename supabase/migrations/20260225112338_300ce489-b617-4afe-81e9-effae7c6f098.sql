
CREATE POLICY "Block public insert"
ON public.waitlist_signups
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block public update"
ON public.waitlist_signups
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public delete"
ON public.waitlist_signups
FOR DELETE
USING (false);
