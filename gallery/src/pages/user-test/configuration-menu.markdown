---
title: "User Test: Configuration menu"
---

# User Test: Configuration menu (10-17 January, 2022)

At the end of last year, we created one Configuration menu by merging Supervisor. In the next iteration, we want to organize our menu by creating logical grouping and combining duplicated features. We are conducting this test to see if we are on the right track.

- Anyone could join
- Respondents recruited on Twitter, Reddit and Home Assistant Forum
- This test is open for 10 days
- UsabilityHub for user test
- Figma for prototype
- 6 questions
- 3 tasks
- Due to some limitations by UsabilityHub, it only worked on desktop

# Results

915 respondents took part in this test and they gave 407 comments. In general there isn’t a significant difference between:

- How long a respondent has been using Home Assistant
- Installation method
- How many visits to its Home Assistant in the past 3 months
- Home Assistant expertise

## Overall menu change

This prototype organized our menu by creating logical grouping and combining duplicated features. What do people think of this change?

### Stats

- 2% (21) Like extremely
- 30% (276) Like very much
- 53% (481) Neutral
- 12% (108) Dislike very much
- 3% (26) Dislike extremely

_3 respondents passed_

### Comments summary

**Like**

- Clean and decluttered
- Style looks better
- Faster to use
- Merging Supervisor into different pages
- Moving Developer tools to Settings

**Dislike**

- Moving Developer tools to Settings
- More clicks for scripts and helpers
- Too many changes at once causes a high learning curve
- Removing the word `Integrations` makes it harder to find them
- Difference between `Addons` and `Services` is a bit subtle
- No clear distinction between `Developer` and `System`
- Material Design got the Google image

**Suggestions**

- More top level menu items for example logs.
- What are settings and what not? Maybe better to name it `Configuration`
- Devices are a first-class citizen in the domain of Home Assistant, and so shouldn't be tucked away in "Settings"
- Rename Developer tools (or make it only for Home Assistant developers)
- Separate administration (for instance creating users / adding lights etc) from development activities (creating automations and scripts)
- Search Bar in Settings
- Feature to put menu items in sidebar
- Unification of add-ons and integrations
- Adding ‘New’ hints to show what changed
- Give `About` a less prominent size
- Accordion view option which puts every tab below
- Dev mode and a Prod Mode
- Always show config menu (on bigger screens)

### Conclusion

We should keep our focus on organizing our menu by creating logical grouping and combining duplicated features. With these changes we make more people happy:

- Reconsider putting `Logs` as a top-level menu item
- Add a search bar
- Use the word `Integrations` with `Devices & Services`
- Moving `Developer tools` to `Settings` is a good idea
- Rename `Developer tools` to for example `Tools`
- Add `New` explanation popups to what has changed
- We could rename `Configuration` to `Settings`
- Give `About` a less prominent size

## Helpers

In Home Assistant you can create toggles, text fields, number sliders, timers and counters. Also known as `Helpers`. Where should they be placed?

### Stats

- 78% (709) respondents are using helpers. They use it for:
- 92% (645) automations and scenes
- 62% (422) dashboards
- 43% (296) virtual devices

### Comments summary

Some respondents commented that they think `Helpers` shouldn’t be listed under `Automations & Services`. Although almost all respondents use it for that specific purpose.

### Conclusion

Helpers is, in addition to `Automations & Services`, also partly seen as virtual devices and dashboard entities.

- We might consider promoting them in their own top-level menu item
- Rename `Helpers` to something with `controls`

## Add person

The first task in this user test was to add a person. Since this has not changed in the current menu structure, this should be an easy assignment. How do people experience the navigation to this feature?

### Stats

95% reached the goal screen and 98% marked the task as completed. There were 18 common paths.

After the task we asked how easy it was to add a person.

- 41% (378) Extremely easy
- 48% (440) Fairly easy
- 7% (67) Neutral
- 2% (19) Somewhat difficult
- 1% (11) Very difficult

### Comments summary

_No mentionable comments _

### Conclusion

This test showed that the current navigation design works.

## YAML

In Home Assistant you can make configuration changes in YAML files. To make these changes take effect you have to reload your YAML in the UI or do a restart. How are people doing this and can they find it in this new design?

### Stats

83% reached the goal screen and 87% marked the task as completed. There were 59 common paths.

After the task we asked how easy it was to reload the YAML changes.

- 4% (40) Extremely easy
- 22% (204) Fairly easy
- 20% (179) Neutral
- 37% (336) Somewhat difficult
- 17% (156) Very difficult

And we asked if they have seen that we've moved some functionality from current `Server Controls` to `Developer Tools`.

- 57% (517) Yes
- 43% (398) No

### Comments summary

**Like**

- YAML in Developer tools

**Dislike**

- Hidden restart and reload
- YAML in Developer Tools
- Combining `Developer tools` with `Server management`
- Reload Home Assistant button isn't clear what it does
- Reload/restart Home Assistant in Developer Tools

**Suggestions**

- Reload all YAML button
- Dev mode and a Prod Mode
- Show restart/reload as buttons in System instead of overflow menu
- Explain that you can reload YAML when you want to restart your system
- YAML reloading under System

### Conclusion

This test showed two different kinds of user groups: UI and YAML users.

- Moving `Developer tools` to `Settings` is a good idea
- YAML users want reload YAML and Home Assistant restart in `System`
- Move the restart and reload button to the `System` page from the overflow menu
- Add suggestion to reload YAML when a user wants to restart
- Add reload all YAML button

## Logs

### Stats

70% reached the goal screen and 77% marked the task as completed. There were 48 common paths.

After the task we asked to find out why your Elgato light isn't working.

- 6% (57) Extremely easy
- 28% (254) Fairly easy
- 21% (188) Neutral
- 21% (196) Somewhat difficult
- 24% (220) Very difficult

### Comments summary

**Suggestions**

- Log errors on the integration page
- Problem solving center

### Conclusion

Although this test shows that a large number of respondents manage to complete the task, they find it difficult to find out the light isn’t working.

- Add logs errors/warnings to the integration page
- Reconsider putting `Logs` as a top-level menu item

## Learnings for next user test

- Explain that topic is closed for comments so that you can do this test without any influence
- Mobile test should work on mobile
- Testing on an iPad got some bugs
- People like doing these kind of test and we should do them more often
