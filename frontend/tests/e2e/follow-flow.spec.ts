import { expect, test } from '@playwright/test'

test('anonymous visitor follows, reloads, and unfollows creators independently', async ({
  page,
}) => {
  const anonymousUserRequests: string[] = []
  page.on('request', (request) => {
    if (
      request.url().endsWith('/users/anonymous') &&
      request.method() === 'POST'
    ) {
      const body = request.postDataJSON() as { id: string }
      anonymousUserRequests.push(body.id)
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Creators to follow' })).toBeVisible()

  const cards = page.locator('.creator-card')
  await expect(cards).toHaveCount(5)
  await expect(cards.first().getByRole('heading', { name: 'Amara Silva' })).toBeVisible()

  const userId = await page.evaluate(() =>
    localStorage.getItem('little-circle-user-id'),
  )
  expect(userId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
  await expect.poll(() => anonymousUserRequests).toEqual([userId])

  const creatorCard = cards.filter({ has: page.getByRole('heading', { name: 'Amara Silva' }) })
  const otherCreatorCard = cards.filter({
    has: page.getByRole('heading', { name: 'Luna Costa' }),
  })
  await expect(creatorCard.getByRole('button', { name: 'Follow Amara Silva' })).toBeVisible()
  await expect(creatorCard.locator('.follower-count strong')).toHaveText('0')
  const otherCreatorButton = otherCreatorCard.getByRole('button', {
    name: 'Follow Luna Costa',
  })
  const otherCreatorButtonElement = await otherCreatorButton.elementHandle()
  await expect(otherCreatorButton).toBeVisible()

  await creatorCard.getByRole('button', { name: 'Follow Amara Silva' }).click()
  await expect(creatorCard.getByRole('button', { name: 'Unfollow Amara Silva' })).toBeVisible()
  await expect(creatorCard.locator('.follower-count strong')).toHaveText('1')
  await expect(otherCreatorButton).toBeVisible()
  const updatedOtherCreatorButton = await otherCreatorButton.elementHandle()
  expect(
    await updatedOtherCreatorButton?.evaluate(
      (button, originalButton) => button.isSameNode(originalButton),
      otherCreatorButtonElement,
    ),
  ).toBe(true)
  await expect(otherCreatorCard.locator('.follower-count strong')).toHaveText('0')

  await page.reload()
  await expect(cards).toHaveCount(5)
  await expect(creatorCard.getByRole('button', { name: 'Unfollow Amara Silva' })).toBeVisible()
  await expect(creatorCard.locator('.follower-count strong')).toHaveText('1')
  await expect(otherCreatorCard.getByRole('button', { name: 'Follow Luna Costa' })).toBeVisible()

  const reloadedUserId = await page.evaluate(() =>
    localStorage.getItem('little-circle-user-id'),
  )
  expect(reloadedUserId).toBe(userId)
  await expect.poll(() => anonymousUserRequests).toEqual([userId, userId])

  await creatorCard.getByRole('button', { name: 'Unfollow Amara Silva' }).click()
  await expect(creatorCard.getByRole('button', { name: 'Follow Amara Silva' })).toBeVisible()
  await expect(creatorCard.locator('.follower-count strong')).toHaveText('0')
  await expect(otherCreatorCard.getByRole('button', { name: 'Follow Luna Costa' })).toBeVisible()
  await expect(otherCreatorCard.locator('.follower-count strong')).toHaveText('0')
})
