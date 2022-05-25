// ==UserScript==
// @name         網站追蹤碼移除工具
// @version      1.0
// @description  移除大多數網站附加在超連結上的 Query String 追蹤碼
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/TrackingTokenStripper.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/TrackingTokenStripper.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function() {

  var s = TrackingTokenStripper(location.href)
      // facebook
      .remove('fbclid', 'www.facebook.com')
      .remove('privacy_mutation_token', 'www.facebook.com')
      .remove('acontext', 'www.facebook.com')
      .remove('__xts__[0]', 'www.facebook.com')
      .remove('notif_t', 'www.facebook.com')
      .remove('notif_id', 'www.facebook.com')
      .remove('ref=notif', 'www.facebook.com')
      .remove('utm_campaignid')

      // google analytics
      .remove('utm_source')
      .remove('utm_medium')
      .remove('utm_term')
      .remove('utm_campaign')
      .remove('utm_content')
      .remove('utm_cid')
      .remove('utm_reader')
      .remove('utm_referrer')
      .remove('utm_name')
      .remove('utm_social')
      .remove('utm_social-type')
      .remove('gclid')
      .remove('igshid')
      .remove('_hsenc')
      .remove('_hsmi')
      .remove('mc_cid')
      .remove('mc_eid')
      .remove('mkt_tok')
      .remove('yclid')
      .remove('_openstat')

      // MSDN
      .remove('redirectedfrom')

      .remove('wt.mc_id')
      .remove('__tn__')
      .remove('gclsrc')
      .remove('itm_source')
      .remove('itm_medium')
      .remove('itm_campaign')
      .remove('mc') // sendgrid.com
      .remove('mcd') // sendgrid.com
      .remove('cvosrc') // sendgrid.com
      .remove('cr_cc') // https://blogs.microsoft.com/

      .remove('sc_channel')
      .remove('sc_campaign')
      .remove('sc_geo')
      .remove('trk')
      .remove('sc_publisher')
      .remove('trkCampaign')
      .remove('sc_outcome')
      .remove('sc_country')

      .remove('__hstc')
      .remove('__hssc')
      .remove('__hsfp')
      .remove('_gl')

      // Yahoo News
      .remove('guce_referrer')
      .remove('guce_referrer_sig')

      .toString();

  if (s && location.href !== s) {
      location.href = s;
      // console.log(s); alert(s);
  }

  function TrackingTokenStripper(url) {
      return {
          remove(name, domain) {
              var [path, ...other] = url.split('?');
              other = other.join('?');

              var [query, ...hash] = other ? other.split('#') : [query, ''];
              hash = hash.join('#');

              if (query) {
                  let new_query = [];
                  for (let param of query.split('&')) {
                      let [param_key, param_val] = param.split('=', 2);
                      let [name_key, name_val] = name.split('=', 2);
                      if (name_val) {
                          if (param_key === name_key && param_val === name_val) { }
                          else { new_query.push(param); }
                      } else {
                          if (param_key === name_key) { }
                          else { new_query.push(param); }
                      }

                  }
                  query = new_query.join('&');
              }

              query = query ? query = '?' + query : '';
              hash = hash ? hash = '#' + hash : '';

              if (url.substr(url.length - 1) == '#') {
                  hash = '#';
              }

              return TrackingTokenStripper(path + query + hash);
          },
          toString() {
              return url;
          }
      }
  }
})();
