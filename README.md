# pydt-lambda-slack-notification
AWS Lambda Slack notifications for Play Your Damn Turn (PYDT)

# nagging feature
Nagging is an optional feature introduced to nag players who are delaying the game with their slow turns
Turn Nagging on or off using the MINOR_NAG, MODERATE_NAG, MAJOR_NAG, and GIGANTIC_NAG constants (choose which ones you want)
Control the window in which to nag using the relevant NAG_WINDOW_OPEN and NAG_WINDOW_CLOSE constants (in minutes)
Control which hours nagging is disabled using the SLEEP_START and SLEEP_END constants (in utc time)
  NOTES:
  - Window Open times must be larger than Window Close times
  - Sleep times are configured in utc time
  - Be careful. This lambda polls every 4 minutes, so a longer nagging window could result in nagging every 4 minutes!

# configuring messages
Ensure config/messages.js exists, populated with json the bot will use when crafting messages.
These can be standard or leader specific messages, controlled by the LEADER_MESSAGES boolean.

# player rank
The "rank" variable is determined by the player's average turn time.
The average turn time is calculated by timeTaken/turnsPlayed in milliseconds.

# getting slack user information
To get a Slack Workspace's User Information, you must create a custom slack app which:
  - Can confirm user’s identity and access your workspace’s profile information.
See the following links for information on how to create the Slack App:
  - https://api.slack.com/slack-apps
  - https://api.slack.com/methods/users.list
The user information is used to match Slack Id to real_name
