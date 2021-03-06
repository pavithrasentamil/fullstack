import React, { useEffect } from 'react';
import { useConfig } from '../../utilities/Config';
import { useAuth } from '../../utilities/Auth';
import Minimal from '../../templates/Minimal';
import Button from '../../elements/Button';
import Meta from '../../utilities/Meta';

import './index.scss';

const baseClass = 'logout';

const Logout: React.FC<{inactivity?: boolean}> = (props) => {
  const { inactivity } = props;

  const { logOut } = useAuth();
  const { routes: { admin } } = useConfig();

  useEffect(() => {
    logOut();
  }, [logOut]);

  return (
    <Minimal className={baseClass}>
      <Meta
        title="Logout"
        description="Logout user"
        keywords="Logout, Payload, CMS"
      />
      <div className={`${baseClass}__wrap`}>
        {inactivity && (
          <h2>You have been logged out due to inactivity.</h2>
        )}
        {!inactivity && (
          <h2>You have been logged out successfully.</h2>
        )}
        <br />
        <Button
          el="anchor"
          buttonStyle="secondary"
          url={`${admin}/login`}
        >
          Log back in
        </Button>
      </div>
    </Minimal>
  );
};

export default Logout;
