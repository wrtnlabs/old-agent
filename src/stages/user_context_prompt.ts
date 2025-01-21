import { InitialInformation } from "../session";

export function buildUserContextPrompt(initialInformation: InitialInformation) {
  const { email, username, job, gender, birth_year, datetime, timezone } =
    initialInformation;
  const userContext = `\
Here is the current user context; refer it if you need information about the user, such as sending emails, gender for cloth recommendation, job for job/career/schedule recommendation, etc:
- email: ${email != null ? `"${email}"` : "N/A"}
- username: ${username != null ? `"${username}"` : "N/A"}
- job: ${job != null ? `"${job}"` : "N/A"}
- gender: ${gender != null ? `"${gender}` : "N/A"}
- birth_year: ${birth_year ?? "N/A"}

But note that all of above information is bound to the account of the Swal AI, Wrtn, so you SHOULD NOT treat it as a name of external service such as Github, Google, etc.\
`;
  const sessionContext = `\
Here is the current system data, such as the current time and its timezone; refer it if you need to know the current time or timezone, for example, specifying the time range for querying the database, setting the time for calendar events, etc:
<current_time>
${datetime ?? "N/A"}
</current_time>
<current_timezone>
${timezone ?? "N/A"}
</current_timezone>

Note that the current timezone is based on the user's timezone, and also the current time is based on the user's timezone. So if user requests to book a meeting, you should refer the current time and its timezone as given above, carefully analyzing and calculating the correct time and timezone in desired format/timezone.

For example, if the current timezone is KST (UTC+9), and the connector requires UTC time, you should convert the current time to UTC time, by subtracting 9 hours from the current time.
`;
  return `${userContext}\n\n${sessionContext}`;
}
