import { UpdateIcon } from "../icon/Icon";
import "./PullIndicator.scss";

/**
 * What a pull on the content below drags out from under the navbar.
 *
 * No props and no state: everything it draws comes off the root element, which is
 * where `usePullToRefresh` writes the pull rather than re-rendering the table
 * under it. Hidden from a screen reader, which has the refresh button instead and
 * is told the outcome by the toast either way.
 */
export default function PullIndicator() {
  return (
    <div className="page__pull" aria-hidden="true">
      <span className="page__pull-puck">
        <UpdateIcon />
      </span>
    </div>
  );
}
