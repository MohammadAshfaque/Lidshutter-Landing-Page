// The questions on the page, in one place so the page, the search-engine data and the AI summary files agree.

import { site } from './site';

export const faqs = [
  {
    q: 'How does LidShutter know when I open the lid?',
    a: 'It listens for the lid and sleep/wake events macOS already sends. On MacBooks with a lid angle sensor, it also reads the angle, so the close sound can start while the lid is still moving.',
  },
  {
    q: 'Does it drain my battery?',
    a: 'No. Battery use is very low: LidShutter sleeps until macOS reports that your lid moved, and it never keeps your Mac awake.',
  },
  {
    q: 'Does it keep running if I close the window?',
    a: 'Yes. Closing the dashboard or pressing ⌘Q tucks LidShutter back into the menu bar, and your sounds keep working. To stop it completely, choose Quit from the menu bar.',
  },
  {
    q: 'How does the trackpad vibration work?',
    a: 'MacBooks with a Force Touch trackpad buzz along with each sound, and each sound has its own pattern. You feel it while a finger rests on the trackpad. Choose Light, Medium, or Strong in Settings (Strong taps harder and more often), or turn it off.',
  },
  {
    q: 'Can it get louder than my Mac’s volume?',
    a: 'Yes. The volume slider goes up to 200%. Above 100%, LidShutter makes the sound itself louder, with a soft limiter so it stays clean instead of crackling.',
  },
  {
    q: 'Can it pick a sound for me?',
    a: 'Yes. Click the dice next to “When I open” or “When I close” in the menu bar, and LidShutter picks a different random sound, plays it, and keeps it as your new choice.',
  },
  {
    q: 'Can I stop it from playing in a meeting?',
    a: 'Yes. Pause it with one switch in the menu bar, turn the volume down, or set it to play only after the lid has been closed for a while.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. It needs the internet once, to activate your key. After that it works offline. If your Mac is online, it quietly re-checks the key about once a week and looks for a new version about once a day. Nothing about how you use it ever leaves your Mac.',
  },
  {
    q: 'Does it collect any data?',
    a: 'Nothing about you or how you use it. The app has no account and no analytics (our website does use Google Analytics, DataFast and Vercel Web Analytics to count visits). Your opening stats stay on your Mac. When you activate, your license key and your Mac’s model go to our payment provider. When it looks for updates, it asks lidshutter.com for the newest version number. That’s all.',
  },
  {
    q: 'How does the license work?',
    a: 'You pay once and your license key appears on the page right after you pay, with the Mac app download. You can always find the key again in your customer portal. Open LidShutter, go to License in the dashboard, paste the key, and press Activate. No subscription, and updates are free.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. You have 7 days from the day you buy to ask for a full refund: email support@lidshutter.com. A refunded key stops working.',
  },
  {
    q: 'Can I use it on more than one Mac?',
    a: 'One key activates one Mac. If you have several, choose a multi-Mac pack (2 to 10 Macs): it’s one key that activates on all of them, and each Mac costs less.',
  },
  {
    q: 'What if I get a new Mac?',
    a: 'In LidShutter, open License and choose Deactivate this Mac. That frees the slot, and you can use the same key on your new Mac.',
  },
  {
    q: 'Which Macs does it work on?',
    a: `Any MacBook running ${site.requirements}. It needs a lid, so it’s made for MacBook Air and MacBook Pro.`,
  },
  {
    q: 'Where are the sounds from?',
    a: 'Every sound is original and generated in code inside the app. There are no recordings and nothing to license, and they’re created in a few milliseconds when they play.',
  },
];
