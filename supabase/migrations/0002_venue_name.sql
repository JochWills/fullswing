-- The venue is St Francis Bay Tennis Club.
alter table public.settings alter column venue_name set default 'St Francis Bay Tennis Club';
update public.settings set venue_name = 'St Francis Bay Tennis Club' where venue_name = 'St Francis Bay Tennis Court';
