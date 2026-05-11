# JunoLab Static Site

Static official website for JunoLab and JunoLab apps.

Suggested production structure:

- `/`: JunoLab official homepage
- `/salayze/`: Salayze app page
- `/salayze/privacy/`: Salayze privacy policy
- `/salayze/support/`: Salayze support page
- `/app-ads.txt`: AdMob app-ads.txt

Deploy this directory to Vercel after connecting the production domain.

Before production:

1. Replace `support@junolab.dev` and `privacy@junolab.dev` if the final mailbox differs.
2. Add business registration details if JunoLab wants them public on the website.
3. Confirm `app-ads.txt` matches the active AdMob publisher ID.
