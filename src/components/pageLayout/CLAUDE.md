# pageLayout

`PageFrame`: the box `AppNavbar` draws once, navbar included. It also holds
the note covering a phone turned on its side, on every page. A week's table
cannot be read across the 500px of height `phone-landscape` allows for, so the
app asks for the phone back the way round instead, under a `ScreenRotation`
icon saying the same thing in a shape.

`PageLayout`: one page's main area inside the frame. Its `pull` prop arms
`usePullToRefresh` on the scrolling area and draws `PullIndicator`, the puck a
pull brings out from under the navbar.

`EmptyState`, a `<p role="status">` for a page with nothing to list, and
`SkeletonStatus`, the hidden "Loading … results" every wireframe stands beside.
