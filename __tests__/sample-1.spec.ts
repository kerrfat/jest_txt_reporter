describe('Sample Test Suite 1', () => {
  it.skip('Test 1', () => {
    expect(true).toBe(true)
  })

  it('Test 2', () => {
    expect(1 + 1).toBe(2)
  })

  it('Test 3', () => {
    expect('hello').toEqual('Hello')
  })

  it('Test 4', () => {
    expect(5 * 5).toEqual(25)
  })

  it('Test 5', () => {
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('Test 6', () => {
    expect({ name: 'John' }).toHaveProperty('name')
  })

  it('Test 7', () => {
    expect(true).toBeTruthy()
  })

  it('Test 8', () => {
    expect(false).toBeFalsy()
  })

  it('Test 9', () => {
    expect(null).toBeNull()
  })

  it('Test 10', () => {
    expect(undefined).toBeUndefined()
  })
})
