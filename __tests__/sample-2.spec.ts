describe('Sample Test Suite 2', () => {
  it('Test 11', () => {
    expect(10 - 5).toBe(5)
  })

  it('Test 12', () => {
    expect('world').toContain('z')
  })

  it('Test 13', () => {
    expect([1, 2, 3]).toContain(2)
  })

  it('Test 14', () => {
    expect('Jest Reporter').toMatch(/Reporter/)
  })

  it('Test 15', () => {
    expect({ age: 30 }).toHaveProperty('age', 30)
  })

  it('Test 16', () => {
    expect([1, 2, 3]).toEqual(expect.arrayContaining([10, 3]))
  })

  it('Test 17', () => {
    expect(100).toBeGreaterThan(50)
  })

  it('Test 18', () => {
    expect(20).toBeLessThan(50)
  })

  it('Test 19', () => {
    expect(3.14159265359).toBeCloseTo(Math.PI, 10)
  })

  it('Test 20', () => {
    expect([1, 2, 3]).not.toContain(4)
  })
})
