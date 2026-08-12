import { describe, expect, it } from 'vitest'
import aigcWorksRule from '../../../cloudbase/rules/aigc_works.json'
import liveWorksRule from '../../../cloudbase/rules/live_works.json'
import photoSeriesRule from '../../../cloudbase/rules/photo_series.json'
import profileRule from '../../../cloudbase/rules/site_profile.json'
import storageRule from '../../../cloudbase/rules/storage.json'
import videosRule from '../../../cloudbase/rules/videos.json'
import adminSeed from '../../../cloudbase/seed/roles.admin.example.json'

describe('CloudBase security artifacts', () => {
  it.each([videosRule, photoSeriesRule, profileRule])('keeps published public reads and owner-only writes', (rule) => {
    expect(rule).toEqual({
      read: "doc.status == 'published' || get('database.roles.admin').roles[auth.uid] == 'owner'",
      write: "get('database.roles.admin').roles[auth.uid] == 'owner'",
    })
  })

  it('restricts live works to published public reads and seeded-admin writes', () => {
    expect(liveWorksRule).toEqual({
      read: "doc.status == 'published' || get('database.roles.admin').roles[auth.uid] == 'owner'",
      write: "get('database.roles.admin').roles[auth.uid] == 'owner'",
    })
  })

  it('restricts AIGC works to published public reads and seeded-admin writes', () => {
    expect(aigcWorksRule).toEqual({
      read: "doc.status == 'published' || get('database.roles.admin').roles[auth.uid] == 'owner'",
      write: "get('database.roles.admin').roles[auth.uid] == 'owner'",
    })
  })

  it('allows public media reads and limits media writes to the seeded admin owner', () => {
    expect(storageRule).toEqual({
      read: true,
      write: "auth != null && auth.uid == '2087367180266692609'",
    })
    expect(storageRule.write).not.toContain('get(')
  })

  it('contains no seeded administrator UID', () => {
    expect(adminSeed).toEqual({ _id: 'admin', roles: {} })
  })
})
