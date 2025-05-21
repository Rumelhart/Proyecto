export const initGoogleAuth = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.gapi) {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: 'AIzaSyDnx8jSDG2Es-t1O5meVfOR8ZW1A_1_9OM'
          }).then(() => resolve(), (error: any) => reject(error));
        });
      } else {
        reject('Google API not loaded');
      }
    });
  };
  