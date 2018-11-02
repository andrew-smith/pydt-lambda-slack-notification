# pydt-lambda-slack-notification
AWS Lambda Slack notifications for Play Your Damn Turn (PYDT)

# nagging feature
Nagging is an optional feature introduced to nag players who are delaying the game with their slow turns
Turn Nagging on or off using the MINOR_NAG, MODERATE_NAG and MAJOR_NAG constants (choose which ones you want)
Control the window in which to nag using the relevant NAG_WINDOW_OPEN and NAG_WINDOW_CLOSE constants (in minutes)
  NOTES:
  - Window Open times > Window Close times
  - Be careful. This lambda polls every 4 minutes, so a longer nagging window could result in nagging every 4 minutes!
