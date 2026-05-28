
DROP POLICY IF EXISTS "History insert" ON public.order_status_history;
CREATE POLICY "History insert" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'operator')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.driver_id = auth.uid())
  );

REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
