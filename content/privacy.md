# Mesa Privacy Policy

_Effective date: November 12, 2026_

Mesa ("we", "us") helps you find food and drink spots and plan crawls. This policy explains what we collect, why, who we share it with, how long we keep it, and the choices you have.

## The short version

- We collect what Mesa needs to work: your account, your taste, where you are while you use the app, and what you save.
- We don't sell your data, show ads, or track you across other apps and websites.
- AI picks are off until you turn them on. With them on, your preferences, a summary of what you save and your searches go to Anthropic. Your name, email, photo and GPS coordinates never do.
- Location is used only while the app is open, and we don't keep a history of where you've been.
- You can delete your account, and everything in it, from inside the app.

The rest of this page is the detail behind each of those.

## What we collect

| Data | Examples | Why |
|---|---|---|
| Account details | Email, name, handle, home city, profile photo (if you add one) | Sign-in and your profile |
| Sign-in data | A user ID from Apple or Google if you sign in with them | Sign-in |
| Location | Your device's location while you use the app, or a city you pick | Finding spots near you and planning crawls |
| Taste preferences | Vibes, budget, cuisines, walk/drive limits, plus anything you type in your own words | Personalizing results |
| Allergies & diet (optional) | Allergies you pick or type (e.g. shellfish, mushrooms) and diets (vegetarian, vegan, halal, kosher) | Steering suggestions and dishes away from things you can't eat |
| Activity | Spots and crawls you save, crawls you complete, distance walked on crawls | Your profile, stats and better picks |
| Browsing signals | Which spots you open and which you swipe away in Wildcard (how often and when last, not where you were) | Better picks; kept 90 days |
| Searches and crawl requests | What you type into search or "Anything else?" | Answering the request |
| Usage counts | How many requests your account made each day (a number, not what you did) | Knowing how many people use Mesa; kept 90 days |

We do **not** collect contacts, payment information or advertising identifiers, and we collect no health information other than the allergies and diet you choose to add. We do not track you across other apps or websites, show ads, or sell your data.

## What Mesa asks your phone for

Mesa asks for two permissions, and works without either.

- **Location, while using the app.** Used to find spots near you and to fill in your home city if you tap "Use my current location". Say no and you can pick a city by hand.
- **Photo library.** Used only when you choose a profile picture. Mesa sees the one photo you pick, not your library. It never asks for the camera.

Mesa doesn't ask for contacts, the microphone, Bluetooth, notifications or tracking permission.

## How location is used

Mesa asks for location only **while you use the app**. Your location is sent to our server with each request to find nearby places and is used to answer that request. We don't keep a history of where you've been.

A few things do carry a place with them:

- Spots you save are stored with their address.
- Crawls you plan are stored with their starting point, stops and route, so you can open them again.
- Your home city, if you add one to your profile, is stored as text.

When you type a neighborhood or city into the location picker, what you type is sent to Google to suggest matches.

## Your profile photo

If you add a photo, it's shrunk on your phone and stored with our database provider. It's saved at a web address that anyone holding the link can open, which is how the app shows it to you. Nobody else sees your profile inside Mesa today. Removing the photo, or deleting your account, deletes it.

## Allergies and diet

Adding allergies or a diet is optional. Mesa uses them only to push suggestions and "Crowd favorites" dishes away from obvious conflicts. **Mesa can't guarantee any place or dish is allergen-free**, and you should always confirm with the restaurant. You can remove them anytime in your taste preferences; deleting your account deletes them.

## AI picks

Mesa can use AI from Anthropic (Claude) to rank spots for you and plan crawls. It's off until you say yes: Mesa asks once after you sign in, and you can change your answer anytime in Profile → Settings → AI picks.

With AI picks **on**, we send Anthropic:

- your taste preferences, including any allergies and diet and anything you typed in your own words;
- a summary of the kinds of spots you save: counts by type, vibe and price, not the places themselves;
- what you type into search and into a crawl's "Anything else?" box;
- the mood you pick, the part of the day and the day of the week;
- the nearby places being ranked, with the walking and driving time to each.

We **never** send your name, email, handle, photo, GPS coordinates, or which spots you opened or swiped away.

With AI picks **off**, Mesa ranks with its own scoring and sends none of the above to Anthropic. The app keeps working; picks are just less tailored.

Anthropic deletes API inputs and outputs from its systems within 30 days, except content it flags for violating its usage policy or must keep by law, and doesn't use them to train its models.

### AI that isn't about you

Separately from AI picks, Mesa uses Anthropic and Google Gemini to summarize a place's public reviews and to look for press coverage of it. For this we send the place's name, address and public reviews. Nothing about you is included, so this runs whether AI picks is on or off.

## What stays on your phone

Your recent searches, the last city you picked by hand, your light or dark mode setting and your AI picks choice are stored on your device, not in your account. Deleting the app removes them.

## Who we share data with

We share data only with service providers that run Mesa for us:

- **Supabase** stores your account, profile, photo, preferences and saved items.
- **Amazon Web Services** hosts our server.
- **Google Maps Platform (Places API)**: we send search areas and search terms to find places, and what you type into the location picker to suggest cities. Place details, photos and reviews come from Google.
- **Google Maps (in the app)**: the maps for crawl routes and saved spots are drawn by Google's map software on your phone, which talks to Google directly under [Google's privacy policy](https://policies.google.com/privacy).
- **Anthropic (Claude AI)**, for AI picks, only if you turn them on. See [AI picks](#ai-picks) for exactly what is sent.
- **Anthropic and Google Gemini (AI), public place data only**, as described above.
- **Apple / Google sign-in**, if you choose them.

Some things leave Mesa only because you ask them to: tapping "Take me there" opens your maps app with the spot's location, sharing a spot goes through your phone's share sheet, and press links open in your browser.

We may also share data if the law requires it.

## Where your data is stored

Supabase and our server are both in the United States (AWS us-east-1, Virginia). If you use Mesa from outside the US, your data is sent to and stored there.

Data travels between the app, our server and these providers over encrypted (HTTPS) connections. No system is perfectly secure, so we also keep what we hold to a minimum.

## How long we keep it

| Data | Kept for |
|---|---|
| Account, profile, photo, preferences, saved spots, saved and completed crawls | Until you remove them or delete your account |
| Crawls you plan but don't save or finish | 7 days |
| Browsing signals (spots opened or swiped away) | 90 days |
| Daily usage counts per account | 90 days |
| Server logs (no request contents) | Up to 3 days |
| Totals not tied to any person, such as how many searches Mesa ran in a day | Up to 400 days |
| What Anthropic holds from AI picks | Up to 30 days, as described above |

## Your choices

- **Delete your account** in the app: Profile → Settings → Delete account. This permanently deletes your profile, photo, preferences, saved spots, crawls, stats and browsing signals. If you can't get into the app, see [how to delete your account](/support/#delete-your-account).
- **Change or remove** your profile details and photo in Profile → Edit profile.
- **Change your taste**, including allergies and diet, anytime. "Clear all" wipes it.
- **AI picks**: turn it on or off in Settings.
- **Location**: turn it off in your phone's settings and pick a city by hand instead.
- **Unsave** any spot or crawl to remove it from your account.

Depending on where you live, you may have rights to access, correct, export or delete your data, or to object to how it's used. Email us to use them. We won't treat you any differently for asking.

## Children

Mesa isn't directed to children under 13, and we don't knowingly collect their data. If you think a child has made an account, email us and we'll delete it.

## Changes

We'll update this page and its effective date when this policy changes, and tell you in the app if the change is significant.

## Contact

Mesa · [support@mesamesa.app](mailto:support@mesamesa.app)
