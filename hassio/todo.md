- [ ] all "good" buttons on right side (`float: right` seems to kill div hight here....), all "evil" buttons red and on the left side
- [ ] use the grey from /config/dashboard for our card-groups (it does not seem to be --primary-text-color <-- looks black when I use it..)
- [ ] new layout for /advanced: maybe all cards on the left (one card group for each) and the log in the right side with a refresh button
- [ ] new layout for /addons, no idea how...
- [ ] talk about error boxes, where are they usefull, are they usefull, where to place them
- [ ] updating data after some APIs are called
- [ ] vertical center card content
- [ ] make the create snapshot button get a spinner (like in old panel on some buttons)
- [ ] check if we get errors when pressing a reboot/update button -> pvizeli should send us an HTTP 200 OK before rebooting
- [ ] scrolling bug (on mobile)
- [ ] scroll back to top when change tab on mobile
- [ ] ask pvizeli to provide all data with 1 API call
- [ ] reduce number of APIs called at the same time - maybe just call the APIs when view requries it
- [ ] align top panels when multiple columns and panel size is different
- [ ] capitalize only first letter (snapshot details name, addon details name, item-info)
- [ ] handle errors for supervisor 'It is already a xxx process running' like `snapshot/restore`


##for PR
- [ ] cc: @pvizeli @frenck @cogneato
- [ ] provide a .zip `with home-assistant-polymer` and info how to setup/ update for testers
- [ ] provide screenshots, also 1 from mobile