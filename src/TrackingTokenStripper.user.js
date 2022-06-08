// ==UserScript==
// @name         網站追蹤碼移除工具
// @version      1.4
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

(function () {
    'use strict';

    const oldReplaceState = history.replaceState;
    history.replaceState = function replaceState() {
        let ret = oldReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('replacestate'));
        window.dispatchEvent(new Event('locationchange'));
        return ret;
    };

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'));
    });

    window.addEventListener('locationchange', function () {
        executeActions();
    });

    executeActions();

    function executeActions() {

        var s = TrackingTokenStripper(location.href)
            // facebook
            .remove('fbclid')
            .removeByDomain('www.facebook.com', 'privacy_mutation_token')
            .removeByDomain('www.facebook.com', 'acontext')
            .removeByDomain('www.facebook.com', '__xts__[0]')
            .removeByDomain('www.facebook.com', 'notif_t')
            .removeByDomain('www.facebook.com', 'notif_id')
            .removeByDomain('www.facebook.com', 'notif_ids[0]')
            .removeByDomain('www.facebook.com', 'notif_ids[1]')
            .removeByDomain('www.facebook.com', 'notif_ids[2]')
            .removeByDomain('www.facebook.com', 'notif_ids[3]')
            .removeByDomain('www.facebook.com', 'ref', 'notif')
            .removeByDomain('www.facebook.com', 'ref', 'watch_permalink')

            // google analytics
            // https://support.google.com/analytics/answer/1033863?hl=en
            .remove('utm_id')
            .remove('utm_source')
            .remove('utm_medium')
            .remove('utm_campaign')
            .remove('utm_term')
            .remove('utm_content')

            // GA - others
            .remove('utm_campaignid')
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

            // Microsoft
            .removeByDomain('docs.microsoft.com', 'ocid')
            .removeByDomain('docs.microsoft.com', 'redirectedfrom')

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
            // console.log('Changing URL', s);
            // location.href = s;
            oldReplaceState.apply(history, [{}, '', s]);
        }

        function TrackingTokenStripper(url) {
            const parsedUrl = new URL(url);
            return {
                remove(name, value) {
                    if (parsedUrl.searchParams.has(name)) {
                        if (value && value === parsedUrl.searchParams.get(name)) {
                            parsedUrl.searchParams.delete(name);
                        }
                        if (!value) {
                            parsedUrl.searchParams.delete(name);
                        }
                    }
                    return TrackingTokenStripper(parsedUrl.toString());
                },
                removeByDomain(domain, name, value) {
                    if (parsedUrl.hostname.toLocaleLowerCase() === domain.toLocaleLowerCase()) {
                        return this.remove(name, value);
                    } else {
                        return this;
                    }
                },
                toString() {
                    return parsedUrl.toString();
                }
            }
        }
    }

})();
