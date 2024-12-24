// ==UserScript==
// @name         網站追蹤碼移除工具
// @version      1.14
// @description  移除大多數網站附加在超連結上的 Query String 追蹤碼
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/TrackingTokenStripper.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/TrackingTokenStripper.user.js
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

    let id = setInterval(executeActions, 500);

    setTimeout(() => { clearInterval(id); }, 2000);

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
            .removeByDomain('www.facebook.com', 'ref=watch_permalink')

            // Dropbox
            .removeByDomain('www.dropbox.com', '_ad')
            .removeByDomain('www.dropbox.com', '_camp')
            .removeByDomain('www.dropbox.com', '_tk')

            // YouTube
            // https://youtu.be/4f-Y9G5ENPc?si=SHSu2hEdSbXGy4_Q
            // https://www.youtube.com/embed/4f-Y9G5ENPc?si=GQFJV_nKMXxpiQb6
            .removeByDomain('youtu.be', 'si')
            .removeByDomain('www.youtube.com', 'si')

            // Google Analytics
            // https://support.google.com/analytics/answer/1033863?hl=en
            .remove('utm_id')
            .remove('utm_source')
            .remove('utm_medium')
            .remove('utm_campaign')
            .remove('utm_term')
            .remove('utm_content')
            .remove('_ga')

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

            // devblogs.microsoft.com
            .removeByDomain('devblogs.microsoft.com', 'utm_issue')
            .removeByDomain('devblogs.microsoft.com', 'utm_position')
            .removeByDomain('devblogs.microsoft.com', 'utm_topic')
            .removeByDomain('devblogs.microsoft.com', 'utm_section')
            .removeByDomain('devblogs.microsoft.com', 'utm_cta')
            .removeByDomain('devblogs.microsoft.com', 'utm_description')
            .removeByDomain('devblogs.microsoft.com', 'ocid')

            // blogs.microsoft.com
            .removeByDomain('blogs.microsoft.com', 'cr_cc')

            // Microsoft sites
            .remove('wt.mc_id')
            .removeByDomain('learn.microsoft.com', 'ocid')
            .removeByDomain('learn.microsoft.com', 'redirectedfrom')

            .removeByDomain('azure.microsoft.com', 'OCID')
            .removeByDomain('azure.microsoft.com', 'ef_id')

            .removeByDomain('www.msn.com', 'ocid')
            .removeByDomain('www.msn.com', 'cvid')

            // bilibili
            .removeByDomain('www.bilibili.com', 'share_source')
            .removeByDomain('www.bilibili.com', 'share_medium')

            // Substack related email
            .removeByDomainThatMatchAllKeys("*.substack.com", ['publication_id', 'post_id', 'isFreemail', 'r', 'token', 'triedRedirect'])
            .removeByDomainThatMatchAllKeys("unchartedterritories.tomaspueyo.com", ['publication_id', 'post_id', 'isFreemail', 'r', 'token', 'triedRedirect'])
            .removeByDomainThatMatchAllKeys("www.latent.space", ['publication_id', 'post_id', 'isFreemail', 'r', 'token', 'triedRedirect'])

            // sendgrid.com
            .remove('sendgrid.com', 'mc')
            .remove('sendgrid.com', 'mcd')
            .remove('sendgrid.com', 'cvosrc')

            // Yahoo sites
            .remove('guce_referrer')
            .remove('guce_referrer_sig')

            // Others
            .remove('__tn__')
            .remove('gclsrc')
            .remove('itm_source')
            .remove('itm_medium')
            .remove('itm_campaign')

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
                    if (parsedUrl.searchParams.has(name) && (!value || value === parsedUrl.searchParams.get(name))) {
                        parsedUrl.searchParams.delete(name);
                    }
                    return TrackingTokenStripper(parsedUrl.toString());
                },
                removeByDomain(domain, name) {
                    const hostname = parsedUrl.hostname.toLocaleLowerCase();
                    const normalizedDomain = domain.toLocaleLowerCase();

                    const isWildcard = normalizedDomain.startsWith('*') || normalizedDomain.startsWith('.');
                    const domainToMatch = isWildcard
                        ? normalizedDomain.replace(/^\*\./, '').replace(/^\./, '') // Remove wildcard character
                        : normalizedDomain;

                    const domainMatch = isWildcard
                        ? hostname.endsWith(domainToMatch) // Wildcard only checks if it ends with the specified domain
                        : hostname === domainToMatch; // Non-wildcard must match exactly

                    if (domainMatch) {
                        if (name.indexOf('=') >= 0) {
                            var [key, value] = name.split("=");
                            return this.remove(key, value);
                        } else {
                            return this.remove(name);
                        }
                    } else {
                        return this;
                    }
                },
                /**
                 * 僅當所有 keys 都存在時，移除這些 Query string keys
                 * @param {string|null} domain 指定的 domain，若為 null 則符合所有域名
                 * @param  {...string} keys 不定個數的 query string keys
                 * @returns {object} 返回 TrackingTokenStripper 物件
                 */
                removeByDomainThatMatchAllKeys(domain, keys) {
                    const hostname = parsedUrl.hostname.toLocaleLowerCase();
                    const normalizedDomain = domain ? domain.toLocaleLowerCase() : null;

                    const isWildcard = normalizedDomain && (normalizedDomain.startsWith('*') || normalizedDomain.startsWith('.'));
                    const domainToMatch = normalizedDomain
                        ? isWildcard
                            ? normalizedDomain.replace(/^\*\./, '').replace(/^\./, '') // 移除萬用字元
                            : normalizedDomain
                        : null;

                    const domainMatch = normalizedDomain
                        ? isWildcard
                            ? hostname.endsWith(domainToMatch) // 萬用字元只檢查是否以指定域名結尾
                            : hostname === domainToMatch // 非萬用字元完全符合
                        : true; // 如果 domain 為空，視為符合任何域名

                    // 確認所有 keys 都存在
                    const allKeysExist = keys.every(key => parsedUrl.searchParams.has(key));

                    if (domainMatch && allKeysExist) {
                        keys.forEach(key => {
                            parsedUrl.searchParams.delete(key);
                        });
                    }

                    return this;
                },
                toString() {
                    return parsedUrl.toString();
                }
            }
        };
    }
}) ();
