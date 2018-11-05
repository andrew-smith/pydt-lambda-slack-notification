# pydt-lambda-slack-notification
AWS Lambda Slack notifications for Play Your Damn Turn (PYDT)

# timezone
Configure the timezone relevant to your deployment in the serverless.yml environment variables

# nagging feature
Nagging is an optional feature introduced to nag players who are delaying the game with their slow turns
Turn Nagging on or off using the MINOR_NAG, MODERATE_NAG, MAJOR_NAG, and GIGANTIC_NAG constants (choose which ones you want)
Control the window in which to nag using the relevant NAG_WINDOW_OPEN and NAG_WINDOW_CLOSE constants (in minutes)
Control which hours nagging is disabled using the SLEEP_START and SLEEP_END constants (see timezones above)
  NOTES:
  - Window Open times must be larger than Window Close times
  - Sleep times are configured for your timezone (see timezones above)
  - Be careful. This lambda polls every 4 minutes, so a longer nagging window could result in nagging every 4 minutes!
