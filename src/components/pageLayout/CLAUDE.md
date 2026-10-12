# pageLayout

`PageFrame`: the box `AppNavbar` draws once, navbar included. `PageFrame`
also holds the note covering a phone turned on its side, on every page. A week's
table cannot be read in the 500px of height `phone-landscape` allows. The note
asks for the phone back the way round, under a `ScreenRotation` icon.

`PageLayout`: one page's main area inside the frame. Its `pull` prop arms
`usePullToRefresh` on the scrolling area. It draws `PullIndicator`, the puck a
pull brings out from under the navbar.

`EmptyState`, a `<p role="status">` for a page with nothing to list, and
`SkeletonStatus`, the hidden "Loading … results" every wireframe stands beside.
