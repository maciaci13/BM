create policy "Authenticated can insert cache" on public.product_cache
  for insert to authenticated with check (true);
create policy "Authenticated can update cache" on public.product_cache
  for update to authenticated using (true) with check (true);
create policy "Users can update own scans" on public.scan_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
