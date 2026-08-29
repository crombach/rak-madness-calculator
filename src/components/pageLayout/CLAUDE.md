# pageLayout

`PageLayout`: the chrome every page shares, documented on the component itself.
Its `pull` prop arms `usePullToRefresh` on the scrolling area and draws
`PullIndicator`, the puck a pull brings out from under the navbar.

It also holds the note that covers a phone turned on its side, on every page: a
week's table cannot be read across the 500px of height `phone-landscape` allows
for, so the app asks for the phone back the way round instead, under a
`ScreenRotation` icon saying the same thing in a shape.
