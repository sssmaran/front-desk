Hi Dana,

I built a local app where your team can look up visits by date and visit type, open individual visits, and check the busiest days and hours. FYI, I chose Next.js for this particular task because it supports the pages and API in one application, making it straightforward to run locally.

Across the three months of recorded visits, Wednesday is the busiest day and 9–10 am is the busiest hour (all recorded interviews also signed in then).

During my initial look through the data, I noticed missing sign-out times and repeated sign-ins. With Claude’s help, I checked the exact numbers and found 58 entries that look like repeated submissions. These matched earlier visits and were submitted within two minutes, without a sign-out, so I excluded them from the counts. That leaves 1,953 visits.

Of those, 870 have no sign-out time, so I wouldn’t rely on this data to calculate how long someone stayed. There are also no recorded sign-ins for August 10–13. Since those were weekdays, do you know if there was an issue with recording or exporting the data during those days? I’ve flagged it in the app so your team knows the counts covering those dates might be lower than the actual number of visits.

I also found differences in capitalization and extra spaces in the access list, so email matching ignores those. Only addresses on that list can be registered. Both admins and viewers can see visit information, but admins get the visitor details. Viewers see “Visitor” with a visit reference instead, so they can still identify a particular visit without seeing who it was. The API doesn’t send them the identity details.

For anyone refused at signup, I used a generic message asking them to contact you. It gives less information to someone outside the team, but it’s also less helpful to a colleague who mistypes their email.

I’ve kept login fairly simple for this local prototype. Accounts are stored in a local file with hashed passwords, and sessions disappear when the server restarts. There’s no email verification either, so someone could register an unused address from the access list without proving it belongs to them. With real visitor data, I’d use company-managed sign-in, a proper database, secure hosting, access logging and an agreed rule for how long visit records are kept( retention policy).

My next step would be to confirm the missing August data with you and check whether the repeated sign ins should be counted as duplicates.

Thanks,
Santosh
