
const MAXB = 0x100;
const N = 0x1000;
const NP = 12;   // 2^N
const NM = 0xfff;

const Noise3DTexSize = 64;


function s_curve(t)
{
   return( t * t * (3. - 2. * t) );
}

function lerp(t, a, b)
{
    return ( a + t * (b - a) );
}

function setup(i, b0, b1, r0, r1, vec)
{
    var t = vec[i] + N;
    b0 = Math.floor(t) & BM;
    b1 = (b0+1) & BM;
    r0 = t - Math.floort;
    r1 = r0 - 1;

    return {}
}

function at2(rx, ry)
{
    return ( rx * q[0] + ry * q[1] );
}

function at3(rx, ry, rz)
{
    return ( rx * q[0] + ry * q[1] + rz * q[2] );
}

var p = new Int32Array(MAXB + MAXB + 2);

var vConst = MAXB + MAXB + 2;
var g3 = new Float32Array(vConst * 3);
var g3 = new Float32Array(vConst * 3);
var g2 = new Float32Array(vConst * 2);
var g1 = new Float32Array(vConst);

var start;
var B;
var BM;

function SetNoiseFrequency(frequency)
{
	start = 1;
	B = frequency;
	BM = B - 1;
}

function initNoise()
{
    var random_number = Math.random(); 
    var i, j, k;

    for (i = 0; i < B; i++)
    {
        p[i] = i;
        g1[i] = ((Math.random() % (B + B)) - B) / B;

        for (j = 0; j < 2; j++)
        {
            g2[i * 2 + j] = ((Math.random() % (B + B)) - B) / B;
        }
        
        // normalizing g2[i]
        var sum = g2[i * 2] * g2[i * 2] + g2[i * 2 + 1] * g2[i * 2 + 1];
        var s = Math.sqrt(sum);
        g2[i * 2] = g2[i * 2] / s;
        g2[i * 2 + 1] = g2[i * 2 + 1] / s;


        for (j = 0; j < 3; j++)
        {
            g3[i * 3 + j] = ((Math.random() % (B + B)) - B) / B;
        }

        // normalizing g3[i]
        sum = g3[i * 2] * g3[i * 2] + g3[i * 2 + 1] * g3[i * 2 + 1] + g3[i * 2 + 2] * g3[i * 2 + 2];
        s = Math.sqrt(sum);
        g3[i * 2] = g3[i * 2] / s;
        g3[i * 2 + 1] = g3[i * 2 + 1] / s;
        g3[i * 2 + 2] = g3[i * 2 + 2] / s;
    }

    while (--i)
    {
        k = p[i];
        p[i] = p[j = Math.random() % B];
        p[j] = k;
    }

    for (i = 0; i < B + 2; i++)
    {
        p[B + i] = p[i];
        g1[B + i] = g1[i];
        for (j = 0; j < 2; j++)
        {
            g2[(B + i) * (2) + j] = g2[i * 2 + j];
        }

        for (j = 0; j < 3; j++)
        {
            g3[(B + i) * (3) + j] = g3[i * 3 + j];
        }
    }
}

function noise3(vec)
{
    var bx0, bx1, by0, by1, bz0, bz1, b00, b10, b01, b11;
    var rx0, rx1, ry0, ry1, rz0, rz1, sy, sz, a, b, c, d, t, u, v;
    var i, j;

    if(1 == start)
    {
        start = 0;
        initNoise();
    }

    // setup(0, bx0, bx1, rx0, rx1); -> 

    var t = vec[0] + N;
    bx0 = Math.floor(t) & BM;
    bx1 = (bx0+1) & BM;
    rx0 = t - Math.floor(t);
    rx1 = rx0 - 1.0;

    t = vec[1] + N;
    by0 = Math.floor(t) & BM;
    by1 = (by0+1) & BM;
    ry0 = t - Math.floor(t);
    ry1 = ry0 - 1.0;

    t = vec[2] + N;
    bz0 = Math.floor(t) & BM;
    bz1 = (bz0+1) & BM;
    rz0 = t - Math.floor(t);
    rz1 = rz0 - 1.0;

	i = p[bx0];
    j = p[bx1];

    b00 = p[i + by0];
	b10 = p[j + by0];
	b01 = p[i + by1];
    b11 = p[j + by1];

    t = s_curve(rx0);
	sy = s_curve(ry0);
    sz = s_curve(rz0);

    var tp = b00 + bz0;
    u = ( rx0 * g3[tp * 3 + 0] + ry0 * g3[tp * 3 + 1] + rz0 * g3[tp * 3 + 2]);
    tp = b10 + bz0;
    v = ( rx1 * g3[tp* 3 + 0] + ry0 * g3[tp* 3 + 1] + rz0 * g3[tp* 3 + 2]);
    a = lerp(t, u, v);


    tp = b01 + bz0;
    u = (rx0 * g3[tp* 3 + 0] + ry1 * g3[ tp* 3 + 1] + rz0 * g3[tp* 3 + 2]);
    tp = b11 + bz0;
    v = ( rx1 * g3[tp* 3 + 0] + ry1 * g3[tp* 3 + 1] + rz0 * g3[tp* 3 + 2]); 
    b = lerp(t, u, v);

    c = lerp(sy, a, b);

    tp = b00 + bz1;
    u = (rx0 * g3[tp* 3 + 0] + ry0 * g3[ tp* 3 + 1] + rz1 * g3[tp* 3 + 2]);

    tp = b10 + bz1;
    v = ( rx1 * g3[tp* 3 + 0] + ry0 * g3[tp* 3 + 1] + rz1 * g3[tp* 3 + 2]); 
    a = lerp(t, u, v);

    tp = b01 + bz1;
    u = (rx0 * g3[tp* 3 + 0] + ry1 * g3[ tp* 3 + 1] + rz1 * g3[tp* 3 + 2]);
    tp = b11 + bz1;
    v = ( rx1 * g3[tp* 3 + 0] + ry1 * g3[tp* 3 + 1] + rz1 * g3[tp* 3 + 2]); 
    b = lerp(t, u, v);

    d = lerp(sy, a, b);

    return lerp(sz, c, d);
}


function make3DNoiseTexture()
{
    var f, i, j, k, inc;
    var startFrequency = 4;
    var frequency = startFrequency;
    var inci, incj, inck;
    var ptr;
    var ni = new Float32Array([0.0, 0.0, 0.0]);

    var amp = 0.5;
    var numOctaves = 4;
    var arrSize = Noise3DTexSize * Noise3DTexSize * Noise3DTexSize * 4;
    var arrayData = new Uint8Array(arrSize);

    for (f = 0, inc = 0; f < numOctaves; ++f, frequency *= 2, ++inc, amp *= 0.5)
    {
        SetNoiseFrequency(frequency);
        ni[0] = ni[1] = ni[2] = 0;
        ptr = 0;

        inci = 1.0 / (Noise3DTexSize / frequency);
        for (i = 0; i < Noise3DTexSize; ++i, ni[0] += inci)
        {
            incj = 1.0 / (Noise3DTexSize / frequency);
            for (j = 0; j < Noise3DTexSize; ++j, ni[1] += incj)
            {
                inck = 1.0 / (Noise3DTexSize / frequency);
                for (k = 0; k < Noise3DTexSize; ++k, ni[2] += inck, ptr += 4)
                {
                    arrayData[ptr + inc] = ((noise3(ni) + 1.0) * amp) * 128.0;
                }
            }
        }
    }

    return arrayData;
}

